import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { Customer } from './customer.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  async upsert(
    name: string,
    phone: string,
    document: string,
    queryRunner?: QueryRunner,
  ): Promise<Customer> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(Customer)
      : this.customerRepository;

    const existing = await repo.findOne({ where: { phone } });

    if (existing) {
      existing.name = name;
      existing.document = document;
      return repo.save(existing);
    }

    const customer = repo.create({ name, phone, document });
    return repo.save(customer);
  }
}
