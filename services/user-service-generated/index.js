const config = require('./config');
const logger = require('./logger');
const ExpressServer = require('./expressServer');

let expressServer;

const launchServer = async () => {
  try {
    console.log('Starting server...');
    console.log('Config:', { port: config.URL_PORT, openapi: config.OPENAPI_YAML });
    expressServer = new ExpressServer(config.URL_PORT, config.OPENAPI_YAML);
    console.log('ExpressServer instance created');
    await expressServer.launch();
    logger.info('Express server running');
  } catch (error) {
    console.error('Error details:', error);
    logger.error('Express Server failure', error.message);
    if (expressServer) {
      await expressServer.close();
    }
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  if (expressServer) {
    await expressServer.close();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  if (expressServer) {
    await expressServer.close();
  }
  process.exit(0);
});

launchServer().catch(e => {
  logger.error(e);
  process.exit(1);
});
