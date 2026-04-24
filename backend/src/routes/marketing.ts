/**
 * Marketing Routes
 * API endpoints for managing newsletters and campaigns.
 */

import { Router } from 'express'
import { marketingController } from '../controllers/marketingController'

export const marketingRouter = Router()

/**
 * @swagger
 * /api/marketing/contacts:
 *   post:
 *     summary: Register a marketing contact
 *     tags: [Marketing]
 */
marketingRouter.post('/contacts', marketingController.registerContact)

/**
 * @swagger
 * /api/marketing/campaigns:
 *   post:
 *     summary: Create and send a marketing campaign
 *     tags: [Marketing]
 */
marketingRouter.post('/campaigns', marketingController.sendCampaign)

/**
 * @swagger
 * /api/marketing/campaigns/{id}/stats:
 *   get:
 *     summary: Get campaign statistics
 *     tags: [Marketing]
 */
marketingRouter.get('/campaigns/:id/stats', marketingController.getCampaignStats)

/**
 * @swagger
 * /api/marketing/webhooks/sendgrid:
 *   post:
 *     summary: SendGrid event webhook receiver
 *     tags: [Marketing]
 */
marketingRouter.post('/webhooks/sendgrid', marketingController.handleWebhook)
