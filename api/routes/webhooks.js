const express = require('express');
const router = express.Router();
const AlchemyWebhookService = require('../services/alchemyWebhookService');

// Initialize webhook service
const webhookService = new AlchemyWebhookService();

// Middleware to verify webhook signatures (optional but recommended)
const verifyWebhookSignature = (req, res, next) => {
  // In production, you should verify the webhook signature from Alchemy
  // For now, we'll skip verification for development
  next();
};

// Alchemy webhook endpoint for transaction notifications
router.post('/alchemy', verifyWebhookSignature, (req, res) => {
  try {
    console.log('🔔 Received Alchemy webhook:', {
      headers: req.headers,
      body: req.body,
      timestamp: new Date().toISOString()
    });

    // Handle the webhook notification
    webhookService.handleWebhookNotification(req.body);

    // Respond with 200 to acknowledge receipt
    res.status(200).json({
      success: true,
      message: 'Webhook received and processed',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error processing Alchemy webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process webhook',
      message: error.message
    });
  }
});

// Alchemy webhook endpoint for address activity
router.post('/alchemy/address-activity', verifyWebhookSignature, (req, res) => {
  try {
    console.log('🏠 Received Alchemy address activity webhook:', req.body);

    // Process address activity notification
    if (req.body.event) {
      webhookService.handleAddressActivity(req.body.event);
    }

    res.status(200).json({
      success: true,
      message: 'Address activity webhook processed',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error processing address activity webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process address activity webhook',
      message: error.message
    });
  }
});

// Alchemy webhook endpoint for mined transactions
router.post('/alchemy/mined-transaction', verifyWebhookSignature, (req, res) => {
  try {
    console.log('⛏️ Received Alchemy mined transaction webhook:', req.body);

    // Process mined transaction notification
    if (req.body.event) {
      webhookService.handleMinedTransaction(req.body.event);
    }

    res.status(200).json({
      success: true,
      message: 'Mined transaction webhook processed',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error processing mined transaction webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process mined transaction webhook',
      message: error.message
    });
  }
});

// Alchemy webhook endpoint for dropped transactions
router.post('/alchemy/dropped-transaction', verifyWebhookSignature, (req, res) => {
  try {
    console.log('🗑️ Received Alchemy dropped transaction webhook:', req.body);

    // Process dropped transaction notification
    if (req.body.event) {
      webhookService.handleDroppedTransaction(req.body.event);
    }

    res.status(200).json({
      success: true,
      message: 'Dropped transaction webhook processed',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error processing dropped transaction webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process dropped transaction webhook',
      message: error.message
    });
  }
});

// Get webhook status and configuration
router.get('/status', async (req, res) => {
  try {
    const status = await webhookService.getWebhookStatus();
    
    res.json({
      success: true,
      ...status,
      endpoints: {
        general: '/api/webhooks/alchemy',
        addressActivity: '/api/webhooks/alchemy/address-activity',
        minedTransaction: '/api/webhooks/alchemy/mined-transaction',
        droppedTransaction: '/api/webhooks/alchemy/dropped-transaction'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting webhook status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get webhook status',
      message: error.message
    });
  }
});

// Test webhook endpoint for development
router.post('/test', (req, res) => {
  try {
    console.log('🧪 Test webhook received:', req.body);
    
    res.json({
      success: true,
      message: 'Test webhook received successfully',
      receivedData: req.body,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error processing test webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process test webhook',
      message: error.message
    });
  }
});

module.exports = router;
