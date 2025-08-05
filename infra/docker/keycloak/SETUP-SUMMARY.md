# Peerit Keycloak Container Setup Summary

## 🎯 What Was Created

### 1. Docker Image Build System
- **Dockerfile**: `infra/docker/keycloak/Dockerfile`
  - Based on Keycloak v26+ with pre-configured Peerit realm
  - Includes custom themes and initialization scripts
  - Environment-configurable for different deployments
  - Multi-platform support (AMD64/ARM64)

### 2. GitHub Actions Workflow
- **File**: `.github/workflows/build-keycloak.yml`
- **Trigger**: Manual workflow dispatch
- **Features**:
  - Configurable Keycloak base version
  - Custom image tagging
  - Push to GitHub Container Registry
  - Multi-platform builds with caching
  - Automated testing when not pushing

### 3. Production Deployment Files
- **Production Compose**: `infra/docker/compose.keycloak-prod.yml`
- **Environment Template**: `infra/docker/keycloak/.env.prod`
- **Updated Test Compose**: Enhanced `services/user-service/compose.test.yml`

### 4. Documentation
- **Comprehensive README**: `infra/docker/keycloak/README.md`
- **Usage examples for development and production**
- **Troubleshooting guides**

## 🚀 How to Use

### Building the Image (Manual Trigger)

1. **Go to GitHub Actions**:
   - Navigate to repository → Actions tab
   - Select "Build Peerit Keycloak Image"
   - Click "Run workflow"

2. **Configure Build Parameters**:
   ```
   Keycloak Version: latest (or specific version like 26.0)
   Image Tag: v1.0.0 (or latest, dev, etc.)
   Push to Registry: ✓ true
   ```

3. **Image will be available at**:
   ```
   ghcr.io/pxl-digital-application-samples/peerit-keycloak:v1.0.0
   ```

### Using the Pre-built Image

#### For Development:
```bash
# Pull and run
docker run -d \
  --name peerit-keycloak \
  -p 8080:8080 \
  -e KC_DB_URL=jdbc:postgresql://postgres:5432/keycloak \
  -e KC_DB_USERNAME=keycloak \
  -e KC_DB_PASSWORD=password \
  -e KC_BOOTSTRAP_ADMIN_USERNAME=admin \
  -e KC_BOOTSTRAP_ADMIN_PASSWORD=admin123 \
  ghcr.io/pxl-digital-application-samples/peerit-keycloak:latest
```

#### For Production:
```bash
# Copy and configure environment
cp infra/docker/keycloak/.env.prod .env
nano .env  # Configure your settings

# Start with compose
docker compose -f infra/docker/compose.keycloak-prod.yml up -d
```

#### For Integration Testing:
```bash
# Use in existing test infrastructure
export KEYCLOAK_IMAGE=ghcr.io/pxl-digital-application-samples/peerit-keycloak:latest
docker compose -f services/user-service/compose.test.yml up -d
```

## 🔧 Environment Configuration

### Required Variables:
```env
KC_DB_URL=jdbc:postgresql://your-postgres:5432/keycloak
KC_DB_USERNAME=keycloak
KC_DB_PASSWORD=secure-password
KC_BOOTSTRAP_ADMIN_USERNAME=admin
KC_BOOTSTRAP_ADMIN_PASSWORD=very-secure-password
```

### Optional Variables:
```env
KC_HOSTNAME=auth.yourdomain.com
KC_PROXY=edge
KC_LOG_LEVEL=INFO
KC_DB_SCHEMA=public
```

## 🎯 Benefits

### For External Users:
- **Ready-to-use**: No need to configure Keycloak from scratch
- **Peerit-optimized**: Pre-configured with proper realm settings
- **Container registry**: Easy to pull from GitHub Container Registry
- **Multi-platform**: Works on Intel and ARM architectures

### For Development:
- **Consistent environments**: Same Keycloak setup across dev/test/prod
- **Faster setup**: No manual realm import needed
- **Integration testing**: Real Keycloak with proper configuration

### For Production:
- **Security**: Configurable admin credentials
- **Scalability**: Optimized for production workloads
- **Monitoring**: Built-in health checks and metrics

## 🔄 Workflow Process

1. **Trigger**: Developer manually triggers GitHub Action
2. **Build**: Action builds image with current realm config and themes
3. **Test**: Automated testing ensures image works correctly
4. **Push**: Image pushed to GitHub Container Registry
5. **Tag**: Image tagged with version for easy deployment
6. **Use**: Projects pull and use the pre-configured image

## 📦 Container Registry

**Registry**: `ghcr.io/pxl-digital-application-samples/peerit-keycloak`

**Available Tags**:
- `latest`: Most recent build from main branch
- `v1.0.0`, `v1.1.0`, etc.: Versioned releases
- `main-abc123`: Branch-specific builds with commit SHA

**Pull Commands**:
```bash
# Latest version
docker pull ghcr.io/pxl-digital-application-samples/peerit-keycloak:latest

# Specific version
docker pull ghcr.io/pxl-digital-application-samples/peerit-keycloak:v1.0.0
```

## 🔍 Verification

After building, verify the image works:

```bash
# Test health endpoint
curl http://localhost:8080/health/ready

# Check realm import
curl http://localhost:8080/realms/peerit

# Access admin console
open http://localhost:8080/admin
```

## 🚀 Next Steps

1. **First Build**: Trigger the GitHub Action to create the initial image
2. **Update Compose Files**: Update existing compose files to use the new image
3. **Documentation**: Share the registry URL with external users
4. **CI/CD Integration**: Consider auto-triggering builds on realm config changes

This setup provides a complete, production-ready Keycloak solution that external users can easily deploy while maintaining the flexibility to customize through environment variables.
