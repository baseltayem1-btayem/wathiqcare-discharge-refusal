import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { SendTestNotificationDto } from "./dto/send-test-notification.dto";

@Injectable()
export class NotificationsService {
    constructor(private readonly prisma: PrismaService) { }

    async listNotifications(user: AuthUser, page = 1, pageSize = 20) {
        const skip = (Math.max(Number(page), 1) - 1) * Math.min(Number(pageSize), 100);
        const take = Math.min(Number(pageSize), 100);

        const where = {
            tenantId: user.tenantId,
            OR: [{ recipientUserId: user.id }, { recipientUserId: null }],
        };

        const [items, total] = await this.prisma.$transaction([
            this.prisma.notification.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: "desc" },
            }),
            this.prisma.notification.count({ where }),
        ]);

        return { items, total, page: Number(page), pageSize: take };
    }

    async createNotification(input: {
        tenantId: string;
        refusalCaseId?: string;
        taskId?: string;
        recipientUserId?: string;
        recipientPhone?: string;
        recipientEmail?: string;
        channel: "IN_APP" | "SMS" | "EMAIL" | "WHATSAPP";
        status?: "PENDING" | "SENT" | "FAILED" | "RETRYING";
        errorMessage?: string;
    }) {
        return this.prisma.notification.create({
            data: {
                tenantId: input.tenantId,
                refusalCaseId: input.refusalCaseId,
                taskId: input.taskId,
                recipientUserId: input.recipientUserId,
                recipientPhone: input.recipientPhone,
                recipientEmail: input.recipientEmail,
                channel: input.channel,
                status: input.status || "PENDING",
                errorMessage: input.errorMessage,
            },
        });
    }

    async sendTest(user: AuthUser, dto: SendTestNotificationDto) {
        return this.createNotification({
            tenantId: user.tenantId,
            recipientUserId: dto.recipientUserId,
            recipientPhone: dto.recipientPhone,
            recipientEmail: dto.recipientEmail,
            channel: dto.channel,
            status: "SENT",
        });
    }
}
