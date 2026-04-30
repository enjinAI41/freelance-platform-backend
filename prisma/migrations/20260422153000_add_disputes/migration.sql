-- AlterTable
ALTER TABLE `Project`
    MODIFY `status` ENUM('PENDING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELED', 'DISPUTED', 'RESOLVED') NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE `Dispute` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projectId` INTEGER NOT NULL,
    `milestoneId` INTEGER NULL,
    `openedById` INTEGER NOT NULL,
    `resolvedById` INTEGER NULL,
    `status` ENUM('OPEN', 'CANCELED', 'RESOLVED') NOT NULL DEFAULT 'OPEN',
    `resolution` ENUM('RELEASE_PAYMENT', 'REFUND_PAYMENT', 'PARTIAL_REFUND', 'NO_ACTION') NULL,
    `reason` TEXT NOT NULL,
    `resolutionNote` TEXT NULL,
    `paymentActionNote` TEXT NULL,
    `activeKey` VARCHAR(64) NULL,
    `canceledAt` DATETIME(3) NULL,
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Dispute_activeKey_key`(`activeKey`),
    INDEX `Dispute_projectId_status_createdAt_idx`(`projectId`, `status`, `createdAt`),
    INDEX `Dispute_openedById_status_createdAt_idx`(`openedById`, `status`, `createdAt`),
    INDEX `Dispute_resolvedById_status_createdAt_idx`(`resolvedById`, `status`, `createdAt`),
    INDEX `Dispute_milestoneId_idx`(`milestoneId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Dispute` ADD CONSTRAINT `Dispute_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dispute` ADD CONSTRAINT `Dispute_milestoneId_fkey` FOREIGN KEY (`milestoneId`) REFERENCES `Milestone`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dispute` ADD CONSTRAINT `Dispute_openedById_fkey` FOREIGN KEY (`openedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dispute` ADD CONSTRAINT `Dispute_resolvedById_fkey` FOREIGN KEY (`resolvedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
