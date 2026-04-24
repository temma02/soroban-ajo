/**
 * Marketing Controller
 * Handles API requests for campaigns, contacts, and tracking.
 */

import { Request, Response } from 'express'
import { marketingService } from '../services/marketing/MarketingService'
import { createModuleLogger } from '../utils/logger'

const logger = createModuleLogger('MarketingController')

export const marketingController = {
  /**
   * POST /api/marketing/contacts
   * Register a contact for marketing.
   */
  async registerContact(req: Request, res: Response) {
    try {
      const { email, name, metadata } = req.body
      if (!email) {
        return res.status(400).json({ error: 'Email is required' })
      }

      const contact = await marketingService.registerContact({ email, name, metadata })
      res.status(201).json(contact)
    } catch (error) {
      logger.error('Controller: Failed to register contact', { error })
      res.status(500).json({ error: 'Internal server error' })
    }
  },

  /**
   * POST /api/marketing/campaigns
   * Create and send a new campaign.
   */
  async sendCampaign(req: Request, res: Response) {
    try {
      const { name, subject, content } = req.body
      if (!name || !subject || !content) {
        return res.status(400).json({ error: 'Name, subject, and content are required' })
      }

      const campaign = await marketingService.createAndSendCampaign({ name, subject, content })
      res.status(201).json(campaign)
    } catch (error) {
      logger.error('Controller: Failed to send campaign', { error })
      res.status(500).json({ error: 'Internal server error' })
    }
  },

  /**
   * GET /api/marketing/campaigns/:id/stats
   * Get statistics for a campaign.
   */
  async getCampaignStats(req: Request, res: Response) {
    try {
      const { id } = req.params
      const stats = await marketingService.syncCampaignStats(id)
      res.json(stats)
    } catch (error) {
      logger.error('Controller: Failed to get campaign stats', { error })
      res.status(500).json({ error: 'Internal server error' })
    }
  },

  /**
   * POST /api/marketing/webhooks/sendgrid
   * Handle incoming SendGrid event webhooks.
   */
  async handleWebhook(req: Request, res: Response) {
    try {
      const events = Array.isArray(req.body) ? req.body : [req.body]
      
      for (const event of events) {
        await marketingService.handleTrackingEvent({
          email: event.email,
          event: event.event,
          campaignId: event.singlesend_id || event.campaign_id,
          metadata: event,
        })
      }

      res.status(200).send('OK')
    } catch (error) {
      logger.error('Controller: Failed to handle webhook', { error })
      res.status(500).json({ error: 'Internal server error' })
    }
  },
}
