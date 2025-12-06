const cacheService = require('./cacheService');

class UserExperienceService {
  constructor() {
    this.draftTTL = 3600; // 1 hour for drafts
    this.progressTTL = 1800; // 30 minutes for progress
    this.previewTTL = 600; // 10 minutes for previews
  }

  // Draft Management
  async saveDraft(userId, draftData) {
    try {
      const draftKey = `draft:${userId}:${Date.now()}`;
      const draft = {
        ...draftData,
        id: draftKey,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'draft'
      };

      await cacheService.set(draftKey, draft, this.draftTTL);
      
      // Also save to user's draft list
      const userDraftsKey = `user:${userId}:drafts`;
      const existingDrafts = await cacheService.get(userDraftsKey) || [];
      existingDrafts.unshift(draftKey);
      
      // Keep only last 10 drafts
      if (existingDrafts.length > 10) {
        const oldDraftKey = existingDrafts.pop();
        await cacheService.del(oldDraftKey);
      }
      
      await cacheService.set(userDraftsKey, existingDrafts, this.draftTTL);
      
      console.log('💾 Draft saved successfully:', draftKey);
      return { success: true, draftId: draftKey, draft };
    } catch (error) {
      console.error('❌ Error saving draft:', error);
      return { success: false, error: error.message };
    }
  }

  async updateDraft(draftId, draftData) {
    try {
      const existingDraft = await cacheService.get(draftId);
      if (!existingDraft) {
        return { success: false, error: 'Draft not found' };
      }

      const updatedDraft = {
        ...existingDraft,
        ...draftData,
        updatedAt: new Date().toISOString()
      };

      await cacheService.set(draftId, updatedDraft, this.draftTTL);
      
      console.log('📝 Draft updated successfully:', draftId);
      return { success: true, draft: updatedDraft };
    } catch (error) {
      console.error('❌ Error updating draft:', error);
      return { success: false, error: error.message };
    }
  }

  async getDraft(draftId) {
    try {
      const draft = await cacheService.get(draftId);
      if (!draft) {
        return { success: false, error: 'Draft not found' };
      }

      return { success: true, draft };
    } catch (error) {
      console.error('❌ Error getting draft:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserDrafts(userId) {
    try {
      const userDraftsKey = `user:${userId}:drafts`;
      const draftIds = await cacheService.get(userDraftsKey) || [];
      
      const drafts = [];
      for (const draftId of draftIds) {
        const draft = await cacheService.get(draftId);
        if (draft) {
          drafts.push(draft);
        }
      }

      return { success: true, drafts };
    } catch (error) {
      console.error('❌ Error getting user drafts:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteDraft(draftId, userId) {
    try {
      // Remove from cache
      await cacheService.del(draftId);
      
      // Remove from user's draft list
      const userDraftsKey = `user:${userId}:drafts`;
      const existingDrafts = await cacheService.get(userDraftsKey) || [];
      const updatedDrafts = existingDrafts.filter(id => id !== draftId);
      await cacheService.set(userDraftsKey, updatedDrafts, this.draftTTL);
      
      console.log('🗑️ Draft deleted successfully:', draftId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting draft:', error);
      return { success: false, error: error.message };
    }
  }

  // Progress Persistence
  async saveProgress(sessionId, progressData) {
    try {
      const progressKey = `progress:${sessionId}`;
      const progress = {
        ...progressData,
        sessionId,
        updatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + this.progressTTL * 1000).toISOString()
      };

      await cacheService.set(progressKey, progress, this.progressTTL);
      
      console.log('📊 Progress saved successfully:', progressKey);
      return { success: true, progress };
    } catch (error) {
      console.error('❌ Error saving progress:', error);
      return { success: false, error: error.message };
    }
  }

  async getProgress(sessionId) {
    try {
      const progressKey = `progress:${sessionId}`;
      const progress = await cacheService.get(progressKey);
      
      if (!progress) {
        return { success: false, error: 'Progress not found' };
      }

      // Check if progress has expired
      if (new Date() > new Date(progress.expiresAt)) {
        await cacheService.del(progressKey);
        return { success: false, error: 'Progress expired' };
      }

      return { success: true, progress };
    } catch (error) {
      console.error('❌ Error getting progress:', error);
      return { success: false, error: error.message };
    }
  }

  async clearProgress(sessionId) {
    try {
      const progressKey = `progress:${sessionId}`;
      await cacheService.del(progressKey);
      
      console.log('🧹 Progress cleared successfully:', progressKey);
      return { success: true };
    } catch (error) {
      console.error('❌ Error clearing progress:', error);
      return { success: false, error: error.message };
    }
  }

  // NFT Preview Generation
  async generatePreview(previewData) {
    try {
      const previewId = `preview:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
      
      const preview = {
        id: previewId,
        ...previewData,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + this.previewTTL * 1000).toISOString()
      };

      // Generate preview metadata
      const previewMetadata = this.createPreviewMetadata(preview);
      preview.metadata = previewMetadata;

      // Generate preview image URL (placeholder or actual preview)
      preview.previewImageUrl = this.generatePreviewImageUrl(preview);

      await cacheService.set(previewId, preview, this.previewTTL);
      
      console.log('🖼️ Preview generated successfully:', previewId);
      return { success: true, preview };
    } catch (error) {
      console.error('❌ Error generating preview:', error);
      return { success: false, error: error.message };
    }
  }

  createPreviewMetadata(preview) {
    return {
      name: preview.name || 'Untitled NFT',
      description: preview.description || 'NFT created with NFTGen',
      image: preview.previewImageUrl || 'https://via.placeholder.com/400x400?text=NFT+Preview',
      attributes: preview.attributes || [],
      external_url: `https://nftgen.nija.app/preview/${preview.id}`,
      created_at: preview.createdAt,
      preview: true,
      platform: 'NFTGen - Nija Ecosystem'
    };
  }

  generatePreviewImageUrl(preview) {
    if (preview.image) {
      return preview.image;
    }

    // Generate placeholder with NFT details
    const name = encodeURIComponent(preview.name || 'NFT Preview');
    const color = this.generateColorFromName(preview.name || 'default');
    
    return `https://via.placeholder.com/400x400/${color}/ffffff?text=${name}`;
  }

  generateColorFromName(name) {
    // Generate a consistent color based on the name
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const color = Math.abs(hash).toString(16).substring(0, 6);
    return color.padEnd(6, '0');
  }

  async getPreview(previewId) {
    try {
      const preview = await cacheService.get(previewId);
      
      if (!preview) {
        return { success: false, error: 'Preview not found' };
      }

      // Check if preview has expired
      if (new Date() > new Date(preview.expiresAt)) {
        await cacheService.del(previewId);
        return { success: false, error: 'Preview expired' };
      }

      return { success: true, preview };
    } catch (error) {
      console.error('❌ Error getting preview:', error);
      return { success: false, error: error.message };
    }
  }

  // Session Management for UX
  async createSession(userId, deviceInfo = {}) {
    try {
      const sessionId = `session:${userId}:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
      
      const session = {
        id: sessionId,
        userId,
        deviceInfo,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        isActive: true
      };

      await cacheService.set(sessionId, session, 86400); // 24 hours
      
      console.log('🔐 Session created successfully:', sessionId);
      return { success: true, sessionId, session };
    } catch (error) {
      console.error('❌ Error creating session:', error);
      return { success: false, error: error.message };
    }
  }

  async updateSessionActivity(sessionId) {
    try {
      const session = await cacheService.get(sessionId);
      if (!session) {
        return { success: false, error: 'Session not found' };
      }

      session.lastActivity = new Date().toISOString();
      await cacheService.set(sessionId, session, 86400);
      
      return { success: true, session };
    } catch (error) {
      console.error('❌ Error updating session activity:', error);
      return { success: false, error: error.message };
    }
  }

  // Analytics for UX improvements
  async trackUserAction(userId, action, data = {}) {
    try {
      const actionKey = `action:${userId}:${Date.now()}`;
      const actionData = {
        userId,
        action,
        data,
        timestamp: new Date().toISOString()
      };

      await cacheService.set(actionKey, actionData, 86400); // 24 hours
      
      // Update user action summary
      const summaryKey = `user:${userId}:actions:summary`;
      const summary = await cacheService.get(summaryKey) || { totalActions: 0, actionTypes: {} };
      
      summary.totalActions++;
      summary.actionTypes[action] = (summary.actionTypes[action] || 0) + 1;
      summary.lastAction = new Date().toISOString();
      
      await cacheService.set(summaryKey, summary, 86400);
      
      console.log('📈 User action tracked:', action, 'for user:', userId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error tracking user action:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserAnalytics(userId) {
    try {
      const summaryKey = `user:${userId}:actions:summary`;
      const summary = await cacheService.get(summaryKey) || { 
        totalActions: 0, 
        actionTypes: {},
        lastAction: null
      };

      return { success: true, analytics: summary };
    } catch (error) {
      console.error('❌ Error getting user analytics:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
module.exports = new UserExperienceService();
