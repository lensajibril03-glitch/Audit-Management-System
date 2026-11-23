import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const frontendOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000';
    app.enableCors({
        origin: frontendOrigin,
        credentials: true,
    });
    app.setGlobalPrefix('api');
    await app.listen(process.env.PORT ?? 4000);
}
await bootstrap();
//# sourceMappingURL=main.js.map