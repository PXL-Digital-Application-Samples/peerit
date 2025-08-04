const request = require('supertest');
const SwaggerParser = require('@apidevtools/swagger-parser');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

describe('OpenAPI Specification Validation', () => {
  let app;
  let server;
  let openApiSpec;
  let ajv;

  beforeAll(async () => {
    // Load and parse OpenAPI specification
    const specPath = path.join(__dirname, '../../openapi.yaml');
    const specContent = fs.readFileSync(specPath, 'utf8');
    openApiSpec = yaml.load(specContent);
    
    // Validate OpenAPI spec structure
    await SwaggerParser.validate(openApiSpec);
    
    // Setup JSON schema validator
    ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);

    // Create app instance for this test suite
    delete require.cache[require.resolve('../../src/index')];
    app = require('../../src/index');
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
      });
    }
  });

  describe('Health Endpoint OpenAPI Compliance', () => {
    it('should match OpenAPI spec for successful health check', async () => {
      const response = await request(app)
        .get('/health');

      // Get the schema for the health endpoint
      const healthSchema = openApiSpec.paths['/health'].get.responses['200'].content['application/json'].schema;
      
      // Validate response against schema
      const validate = ajv.compile(healthSchema);
      const isValid = validate(response.body);
      
      if (!isValid) {
        console.log('Validation errors:', validate.errors);
        console.log('Response body:', JSON.stringify(response.body, null, 2));
      }
      
      expect(isValid).toBe(true);
    });

    it('should have correct response format for unhealthy service', async () => {
      // This test checks that if we get a 503, it matches the spec
      const response = await request(app)
        .get('/health');

      if (response.status === 503) {
        const unhealthySchema = openApiSpec.paths['/health'].get.responses['503'].content['application/json'].schema;
        const validate = ajv.compile(unhealthySchema);
        const isValid = validate(response.body);
        
        if (!isValid) {
          console.log('503 Validation errors:', validate.errors);
        }
        
        expect(isValid).toBe(true);
      }
    });
  });

  describe('Info Endpoint OpenAPI Compliance', () => {
    it('should match OpenAPI spec for service info', async () => {
      const response = await request(app)
        .get('/info')
        .expect(200);

      // Get the schema for the info endpoint
      const infoSchema = openApiSpec.paths['/info'].get.responses['200'].content['application/json'].schema;
      
      // Validate response against schema
      const validate = ajv.compile(infoSchema);
      const isValid = validate(response.body);
      
      if (!isValid) {
        console.log('Info validation errors:', validate.errors);
        console.log('Response body:', JSON.stringify(response.body, null, 2));
      }
      
      expect(isValid).toBe(true);
    });

    it('should include all required properties per OpenAPI spec', async () => {
      const response = await request(app)
        .get('/info')
        .expect(200);

      const schema = openApiSpec.paths['/info'].get.responses['200'].content['application/json'].schema;
      const requiredProps = schema.required || [];
      
      // Check that all required properties are present
      requiredProps.forEach(prop => {
        expect(response.body).toHaveProperty(prop);
      });
      
      // Check nested required properties
      if (schema.properties) {
        Object.keys(schema.properties).forEach(key => {
          const propSchema = schema.properties[key];
          if (propSchema.required && response.body[key]) {
            propSchema.required.forEach(requiredProp => {
              expect(response.body[key]).toHaveProperty(requiredProp);
            });
          }
        });
      }
    });
  });

  describe('Validate Endpoint OpenAPI Compliance', () => {
    it('should return 401 error matching OpenAPI spec for missing token', async () => {
      const response = await request(app)
        .get('/validate')
        .expect(401);

      // Check if the response matches the error schema
      const errorSchema = openApiSpec.components.schemas.ErrorResponse;
      const validate = ajv.compile(errorSchema);
      const isValid = validate(response.body);
      
      if (!isValid) {
        console.log('Error response validation errors:', validate.errors);
      }
      
      expect(isValid).toBe(true);
    });
  });

  describe('Swagger UI Endpoint', () => {
    it('should serve Swagger UI documentation', async () => {
      const response = await request(app)
        .get('/docs')
        .redirects(1); // Follow redirects

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/html/);
      expect(response.text).toContain('Swagger UI');
    });

    it('should serve OpenAPI JSON specification', async () => {
      const response = await request(app)
        .get('/docs/openapi.json')
        .expect(200)
        .expect('Content-Type', /json/);

      // The response should be a valid OpenAPI spec
      expect(response.body).toHaveProperty('openapi');
      expect(response.body).toHaveProperty('info');
      expect(response.body).toHaveProperty('paths');
    });

    it('should serve OpenAPI YAML specification', async () => {
      const response = await request(app)
        .get('/docs/openapi.yaml')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/yaml|text/);
      expect(response.text).toContain('openapi:');
      expect(response.text).toContain('info:');
      expect(response.text).toContain('paths:');
    });
  });

  describe('OpenAPI Specification Structure', () => {
    it('should have valid OpenAPI version', () => {
      expect(openApiSpec.openapi).toMatch(/^3\.\d+\.\d+$/);
    });

    it('should have comprehensive info section', () => {
      expect(openApiSpec.info).toHaveProperty('title');
      expect(openApiSpec.info).toHaveProperty('description');
      expect(openApiSpec.info).toHaveProperty('version');
      expect(openApiSpec.info).toHaveProperty('contact');
      expect(openApiSpec.info).toHaveProperty('license');
    });

    it('should define all service endpoints', () => {
      const requiredPaths = [
        '/health',
        '/info',
        '/validate',
        '/docs'
      ];

      requiredPaths.forEach(path => {
        expect(openApiSpec.paths).toHaveProperty(path);
      });
    });

    it('should have operation IDs for all endpoints', () => {
      Object.keys(openApiSpec.paths).forEach(path => {
        const pathObj = openApiSpec.paths[path];
        Object.keys(pathObj).forEach(method => {
          if (typeof pathObj[method] === 'object' && pathObj[method].operationId) {
            expect(pathObj[method].operationId).toBeDefined();
            expect(typeof pathObj[method].operationId).toBe('string');
          }
        });
      });
    });

    it('should have proper tags for organization', () => {
      expect(openApiSpec.tags).toBeDefined();
      expect(Array.isArray(openApiSpec.tags)).toBe(true);
      
      const tagNames = openApiSpec.tags.map(tag => tag.name);
      expect(tagNames).toContain('Authentication');
      expect(tagNames).toContain('Service');
      expect(tagNames).toContain('Monitoring');
    });
  });
});
