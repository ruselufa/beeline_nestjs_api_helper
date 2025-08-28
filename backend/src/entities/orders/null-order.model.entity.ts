import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'null_order_model', schema: 'public' })
export class NullOrderModel {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    idSystemGc: number;

    @Column()
    idAzatGc: number;

    @Column()
    idUserGc: number;

    @Column({ nullable: true })
    userName: string;

    @Column({ nullable: true })
    userEmail: string;

    @Column({ nullable: true })
    userPhone: string;

    @Column({ nullable: true })
    createdAt: string;

    @Column({ nullable: true })
    payedAt: string;

    @Column({ nullable: true })
    orderName: string;

    @Column({ nullable: true })
    dealStatus: string;

    @Column('float', { nullable: true })
    price: number;

    @Column('float', { nullable: true })
    payedPrice: number;

    @Column('float', { nullable: true })
    payFee: number;

    @Column('float', { nullable: true })
    income: number;

    @Column('float', { nullable: true })
    taxes: number;

    @Column('float', { nullable: true })
    profit: number;

    @Column('float', { nullable: true })
    otherFee: number;

    @Column('float', { nullable: true })
    netProfit: number;

    @Column({ nullable: true })
    managerName: string;

    @Column({ nullable: true })
    city: string;

    @Column({ nullable: true })
    payedBy: string;

    @Column({ nullable: true })
    promocodeUsed: string;

    @Column({ nullable: true })
    promoCompany: string;

    @Column({ nullable: true })
    utmSource: string;

    @Column({ nullable: true })
    utmMedium: string;

    @Column({ nullable: true })
    utmCampaign: string;

    @Column({ nullable: true })
    utmContent: string;

    @Column({ nullable: true })
    utmTerm: string;

    @Column({ nullable: true })
    utmGroup: string;

    @Column({ nullable: true })
    workWithOrder: string;

    @Column({ nullable: true })
    orderComments: string;

    @Column({ nullable: true })
    rejectReason: string;

    @Column({ nullable: true })
    orderTag: string;
} 