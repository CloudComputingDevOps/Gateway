import { Controller, Get, Post, Body, Patch, Param, Delete, Inject, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { catchError, firstValueFrom } from 'rxjs';
import { NATS_SERVICE } from '@/src/config';
import { CreateCareerHistoryDto } from './dto/create-career-history.dto';
import { UpdateCareerHistoryDto } from './dto/update-career-history.dto';
import { PaginationDto } from '@/src/common';

@ApiTags('Career History')
@Controller()
export class CareerHistoryController {
  constructor(
    @Inject(NATS_SERVICE) private readonly client: ClientProxy,
  ) {}

  @Post('create-career-history')
  @ApiOperation({ summary: 'Registrar un nuevo evento en el historial de carrera' })
  @ApiBody({ type: CreateCareerHistoryDto })
  @ApiResponse({ status: 201, description: 'Evento registrado exitosamente.' })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  async create(
    @Body() createCareerHistoryDto: CreateCareerHistoryDto,
  ) {
    return this.client.send({ cmd: 'createCareerHistory' }, createCareerHistoryDto)
      .pipe(catchError((err) => { throw new RpcException(err); }));
  }

  @Get('find-all-career-history')
  @ApiOperation({ summary: 'Obtener todo el historial de carrera (paginado)' })
  @ApiResponse({ status: 200, description: 'Lista de eventos de carrera.' })
  findAll(@Query() paginationDto: PaginationDto) {
    return this.client.send({ cmd: 'findAllCareerHistory' }, paginationDto)
      .pipe(catchError((err) => { throw new RpcException(err); }));
  }

  @Get('find-career-history-by-employee/:id')
  @ApiOperation({ summary: 'Obtener historial laboral de un empleado' })
  @ApiParam({ name: 'id', description: 'ID del empleado', example: 10 })
  @ApiResponse({ status: 200, description: 'Historial laboral del empleado.' })
  async findByEmployee(
    @Param('id', ParseIntPipe) id: number,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.client.send({ cmd: 'findCareerHistoryByEmployee' }, { id_employee: id, paginationDto })
      .pipe(catchError((err) => { throw new RpcException(err); }));
  }

  @Get('find-career-history/:id')
  @ApiOperation({ summary: 'Obtener un evento de carrera por ID' })
  @ApiParam({ name: 'id', description: 'ID del evento de carrera', example: 1 })
  @ApiResponse({ status: 200, description: 'Evento encontrado.' })
  @ApiResponse({ status: 404, description: 'Evento no encontrado.' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    const careerHistory = await firstValueFrom(
      this.client.send({ cmd: 'findOneCareerHistory' }, id)
        .pipe(catchError((err) => { throw new RpcException(err); })),
    );
    return careerHistory;
  }

  @Patch('update-career-history/:id')
  @ApiOperation({ summary: 'Actualizar un evento de carrera por ID' })
  @ApiParam({ name: 'id', description: 'ID del evento de carrera', example: 1 })
  @ApiBody({ type: UpdateCareerHistoryDto })
  @ApiResponse({ status: 200, description: 'Evento actualizado exitosamente.' })
  @ApiResponse({ status: 404, description: 'Evento no encontrado.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCareerHistoryDto: UpdateCareerHistoryDto,
  ) {
    return this.client.send({ cmd: 'updateCareerHistory' }, { ...updateCareerHistoryDto, id })
      .pipe(catchError((err) => { throw new RpcException(err); }));
  }

  @Delete('delete-career-history/:id')
  @ApiOperation({ summary: 'Eliminar un evento de carrera por ID' })
  @ApiParam({ name: 'id', description: 'ID del evento de carrera', example: 1 })
  @ApiResponse({ status: 200, description: 'Evento eliminado exitosamente.' })
  @ApiResponse({ status: 404, description: 'Evento no encontrado.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.client.send({ cmd: 'removeCareerHistory' }, id)
      .pipe(catchError((err) => { throw new RpcException(err); }));
  }

}
