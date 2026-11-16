import { INestApplication, ValidationPipe } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import request = require('supertest');
import { of } from 'rxjs';
import { UsersController } from './users/employees/users.controller';
import { AdminController } from './users/admin/admin.controller';
import { AreasController } from './administrative-data/areas/areas.controller';
import { PositionsController } from './administrative-data/positions/positions.controller';
import { ContractsController } from './administrative-data/contracts/contracts.controller';
import { CareerHistoryController } from './trajectory/career-history/career-history.controller';
import { PerformanceEvaluationController } from './trajectory/performance-evaluation/performance-evaluation.controller';
import { NATS_SERVICE } from './config';

jest.mock('./config', () => ({ NATS_SERVICE: 'NATS_SERVICE' }));

const controllers = [
  UsersController, AdminController, AreasController, PositionsController,
  ContractsController, CareerHistoryController, PerformanceEvaluationController,
];

describe('API pública (HTTP con transporte NATS simulado)', () => {
  let app: INestApplication;
  const client = { send: jest.fn(() => of({ ok: true })) };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers,
      providers: [{ provide: NATS_SERVICE, useValue: client }],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  });

  beforeEach(() => client.send.mockClear());
  afterAll(async () => app.close());

  it('no registra guards ni requisitos Bearer en los controladores', () => {
    for (const controller of controllers) {
      expect(Reflect.getMetadata(GUARDS_METADATA, controller) ?? []).toEqual([]);
      for (const name of Object.getOwnPropertyNames(controller.prototype)) {
        expect(Reflect.getMetadata(GUARDS_METADATA, controller.prototype[name]) ?? []).toEqual([]);
      }
    }
    const document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
    for (const path of Object.values(document.paths)) {
      for (const operation of Object.values(path)) {
        expect(operation.security ?? []).toEqual([]);
      }
    }
  });

  it.each([
    ['/employees/findAll', 'findAllUsers'],
    ['/employees/10', 'findUserById'],
    ['/employees/getMyProfile/test-uuid', 'getMyProfile'],
    ['/employees/getSubordinates/10', 'getSubordinates'],
    ['/employees/firstTimeSetup/test-uuid', 'firstTimeSetup'],
    ['/admin/admin', 'findAllAdmins'],
    ['/admin/1', 'findAdminById'],
    ['/administrative-data/contracts/find-all-contracts', 'findAllContracts'],
    ['/administrative-data/contracts/find-contract/1', 'findOneContract'],
    ['/administrative-data/contracts/find-contracts-by-employee/10', 'findContractsByEmployee'],
    ['/find-career-history/1', 'findOneCareerHistory'],
    ['/find-career-history-by-employee/10', 'findCareerHistoryByEmployee'],
    ['/find-all-performance-evaluation', 'findAllPerformanceEvaluation'],
    ['/find-performance-evaluations-by-employee/10', 'findPerformanceEvaluationsByEmployee'],
  ])('GET %s funciona sin Authorization', async (path, cmd) => {
    await request(app.getHttpServer()).get(`/api${path}`).expect(200);
    expect(client.send).toHaveBeenCalledWith({ cmd }, expect.anything());
    expect(client.send).not.toHaveBeenCalledWith({ cmd: 'verifyToken' }, expect.anything());
  });

  it('crea administradores sin token', async () => {
    const body = { email: 'admin@example.com', name: 'Juan', last_name: 'Perez', age: 30 };
    await request(app.getHttpServer()).post('/api/admin/create-admin').send(body).expect(201);
    expect(client.send).toHaveBeenCalledWith({ cmd: 'createAdmin' }, body);
  });

  it('actualiza perfiles sin identidad autenticada', async () => {
    await request(app.getHttpServer()).patch('/api/employees/updateUser/10')
      .send({ id_employee: 10, age: 30 }).expect(200);
    expect(client.send).toHaveBeenCalledWith({ cmd: 'updateProfile' }, { id_employee: 10, age: 30 });
  });

  it('elimina contratos y modifica jerarquías sin permisos por cargo', async () => {
    await request(app.getHttpServer()).delete('/api/administrative-data/contracts/delete-contract/1').expect(200);
    await request(app.getHttpServer()).put('/api/administrative-data/positions/remove-father/1').expect(200);
  });

  it('genera y escanea QR sin datos de un usuario autenticado', async () => {
    await request(app.getHttpServer()).post('/api/employees/10/qr').expect(201);
    expect(client.send).toHaveBeenCalledWith({ cmd: 'generateEmployeeQr' }, { id_employee: 10 });
    await request(app.getHttpServer()).post('/api/employees/qr/scan').send({ qrToken: 'qr-value' }).expect(201);
    expect(client.send).toHaveBeenCalledWith({ cmd: 'scanEmployeeQr' }, { qrToken: 'qr-value' });
  });

  it('sube imágenes usando employeeId explícito', async () => {
    await request(app.getHttpServer()).patch('/api/employees/upload-profile-image?employeeId=10')
      .attach('file', Buffer.from('image'), 'profile.png').expect(200);
    expect(client.send).toHaveBeenCalledWith({ cmd: 'uploadProfileImage' }, expect.objectContaining({ idUser: 10 }));
  });

  it('mantiene la validación de datos e IDs sin exigir token', async () => {
    await request(app.getHttpServer()).post('/api/admin/create-admin').send({}).expect(400);
    await request(app.getHttpServer()).patch('/api/employees/upload-profile-image')
      .attach('file', Buffer.from('image'), 'profile.png').expect(400);
    expect(client.send).not.toHaveBeenCalled();
  });
});
