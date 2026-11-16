import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Inject,
  Query,
  ParseIntPipe,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { NATS_SERVICE } from '@/src/config';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { firstValueFrom, catchError } from 'rxjs';
import {
  InviteUserDto,
  ScanEmployeeQrDto,
  UpdateProfileDto,
  UpdateEmployeeDto,
} from './dto';

@ApiTags('Employees')
@Controller('employees')
export class UsersController {
  constructor(@Inject(NATS_SERVICE) private readonly client: ClientProxy) {}

  @Post('/inviteUser')
  @ApiOperation({ summary: 'Invitar a un nuevo empleado' })
  @ApiBody({ type: InviteUserDto })
  @ApiResponse({ status: 201, description: 'Invitación enviada exitosamente.' })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  inviteUser(@Body() inviteUserDto: InviteUserDto) {
    return this.client.send({ cmd: 'inviteUser' }, inviteUserDto);
  }

  @Get('/findAll')
  @ApiOperation({ summary: 'Obtener todos los empleados' })
  @ApiResponse({ status: 200, description: 'Lista de empleados.' })
  findAll() {
    return this.client.send({ cmd: 'findAllUsers' }, {});
  }

  @Post('/:id/qr')
  @ApiOperation({ summary: 'Generar código QR temporal de un empleado' })
  @ApiParam({ name: 'id', description: 'ID del empleado', example: '10' })
  @ApiResponse({ status: 201, description: 'QR temporal generado.' })
  generateEmployeeQr(@Param('id', ParseIntPipe) id: number) {
    return this.client.send(
      { cmd: 'generateEmployeeQr' },
      {
        id_employee: id,
      },
    );
  }

  @Post('/qr/scan')
  @ApiOperation({ summary: 'Escanear QR temporal de un empleado' })
  @ApiBody({ type: ScanEmployeeQrDto })
  @ApiResponse({
    status: 200,
    description: 'Datos del empleado.',
  })
  @ApiResponse({ status: 401, description: 'QR expirado.' })
  scanEmployeeQr(@Body() scanEmployeeQrDto: ScanEmployeeQrDto) {
    return this.client.send(
      { cmd: 'scanEmployeeQr' },
      {
        qrToken: scanEmployeeQrDto.qrToken,
      },
    );
  }

  @Get('/:id')
  @ApiOperation({ summary: 'Obtener un empleado por ID' })
  @ApiParam({ name: 'id', description: 'ID del empleado', example: '10' })
  @ApiResponse({ status: 200, description: 'Empleado encontrado.' })
  @ApiResponse({ status: 404, description: 'Empleado no encontrado.' })
  findOne(@Param('id') id: string) {
    return this.client.send({ cmd: 'findUserById' }, Number(id));
  }

  @Get('/getMyProfile/:id')
  @ApiOperation({ summary: 'Obtener el perfil de un empleado' })
  @ApiParam({ name: 'id', description: 'UUID del usuario en Supabase' })
  @ApiResponse({ status: 200, description: 'Perfil del empleado.' })
  getMyProfile(@Param('id') id: string) {
    return this.client.send({ cmd: 'getMyProfile' }, id);
  }

  @Get('/getSubordinates/:id')
  @ApiOperation({ summary: 'Obtener los subordinados de un gerente' })
  @ApiParam({ name: 'id', description: 'ID del gerente', example: '5' })
  @ApiResponse({
    status: 200,
    description: 'Lista de subordinados del gerente.',
  })
  getSubordinates(@Param('id') id: string) {
    return this.client.send({ cmd: 'getSubordinates' }, Number(id));
  }

  @Patch('/updateUser/:id')
  @ApiOperation({ summary: 'Actualizar el perfil de un empleado' })
  @ApiParam({ name: 'id', description: 'ID del empleado', example: '10' })
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({ status: 200, description: 'Perfil actualizado exitosamente.' })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  updateUser(
    @Param('id') id: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.client.send(
      { cmd: 'updateProfile' },
      { ...updateProfileDto, id_employee: Number(id) },
    );
  }

  @Patch('/updateEmployee/:id')
  @ApiOperation({
    summary:
      'Actualizar cargo, jefe o estado de un empleado (uso administrativo)',
  })
  @ApiParam({ name: 'id', description: 'ID del empleado', example: '10' })
  @ApiBody({ type: UpdateEmployeeDto })
  @ApiResponse({
    status: 200,
    description: 'Empleado actualizado exitosamente.',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  updateEmployee(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    return this.client.send(
      { cmd: 'updateEmployee' },
      { ...updateEmployeeDto, id_employee: id },
    );
  }

  @Get('/firstTimeSetup/:id')
  @ApiOperation({
    summary: 'Verificar si el empleado necesita configuración inicial',
  })
  @ApiParam({ name: 'id', description: 'UUID del usuario en Supabase' })
  @ApiResponse({ status: 200, description: 'Estado de configuración inicial.' })
  firstTimeSetup(@Param('id') id: string) {
    return this.client.send({ cmd: 'firstTimeSetup' }, id);
  }

  @Patch('/completeFirstLogin/:id')
  @ApiOperation({ summary: 'Marcar el primer login como completado' })
  @ApiParam({ name: 'id', description: 'UUID del usuario en Supabase' })
  @ApiResponse({
    status: 200,
    description: 'Primer login marcado como completado.',
  })
  completeFirstLogin(@Param('id') id: string) {
    return this.client.send({ cmd: 'completeFirstLogin' }, id);
  }

  @Patch('/upload-profile-image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Subir imagen de perfil de un empleado' })
  @ApiQuery({ name: 'employeeId', type: Number, required: true })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Imagen de perfil',
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Imagen de perfil',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Imagen de perfil actualizada correctamente.',
  })
  @ApiResponse({
    status: 400,
    description: 'Archivo inválido o faltante.',
  })
  async uploadProfileImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('employeeId', ParseIntPipe) employeeId: number,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const payload = {
      idUser: employeeId,
      bufferBase64: file.buffer.toString('base64'),
      mimetype: file.mimetype,
      originalname: file.originalname,
      fieldname: file.fieldname,
      encoding: file.encoding,
    };

    return firstValueFrom(
      this.client.send({ cmd: 'uploadProfileImage' }, payload).pipe(
        catchError((err) => {
          throw new RpcException(err);
        }),
      ),
    );
  }
}
