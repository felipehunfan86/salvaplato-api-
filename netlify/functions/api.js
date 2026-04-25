// Netlify serverless function — wraps the NestJS app
// Netlify corre "npm run build" primero, así que dist/ ya existe al ejecutarse

require('reflect-metadata');
const serverless = require('serverless-http');
const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');

let cachedHandler;

async function bootstrap() {
  const { AppModule } = require('../../dist/app.module');

  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
  });

  await app.init();
  return serverless(app.getHttpAdapter().getInstance());
}

exports.handler = async (event, context) => {
  // Reutilizar la instancia entre invocaciones (warm start)
  if (!cachedHandler) {
    cachedHandler = await bootstrap();
  }
  return cachedHandler(event, context);
};
