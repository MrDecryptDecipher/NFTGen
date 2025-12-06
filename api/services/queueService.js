const cacheService = require('./cacheService');

class QueueService {
  constructor() {
    this.queues = new Map();
    this.workers = new Map();
    this.isProcessing = false;
    this.maxConcurrentJobs = 5;
    this.jobTimeout = 300000; // 5 minutes
    this.retryAttempts = 3;
    this.retryDelay = 5000; // 5 seconds
    
    this.init();
  }

  init() {
    // Initialize default queues
    this.createQueue('nft-processing', { 
      maxConcurrentJobs: 3,
      priority: 'high'
    });
    
    this.createQueue('image-processing', { 
      maxConcurrentJobs: 2,
      priority: 'medium'
    });
    
    this.createQueue('metadata-processing', { 
      maxConcurrentJobs: 5,
      priority: 'medium'
    });
    
    this.createQueue('blockchain-operations', { 
      maxConcurrentJobs: 2,
      priority: 'high'
    });
    
    this.createQueue('analytics', { 
      maxConcurrentJobs: 1,
      priority: 'low'
    });

    // Start processing
    this.startProcessing();
    
    console.log('🔄 Queue service initialized with', this.queues.size, 'queues');
  }

  createQueue(name, options = {}) {
    const queue = {
      name,
      jobs: [],
      processing: [],
      completed: [],
      failed: [],
      options: {
        maxConcurrentJobs: options.maxConcurrentJobs || this.maxConcurrentJobs,
        priority: options.priority || 'medium',
        retryAttempts: options.retryAttempts || this.retryAttempts,
        retryDelay: options.retryDelay || this.retryDelay
      },
      stats: {
        totalJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        averageProcessingTime: 0
      }
    };

    this.queues.set(name, queue);
    console.log(`📋 Queue '${name}' created with options:`, queue.options);
    
    return queue;
  }

  async addJob(queueName, jobData, options = {}) {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        throw new Error(`Queue '${queueName}' not found`);
      }

      const job = {
        id: `job:${queueName}:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`,
        queueName,
        data: jobData,
        options: {
          priority: options.priority || queue.options.priority,
          retryAttempts: options.retryAttempts || queue.options.retryAttempts,
          delay: options.delay || 0,
          timeout: options.timeout || this.jobTimeout
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
        attempts: 0,
        errors: []
      };

      // Add delay if specified
      if (job.options.delay > 0) {
        job.executeAt = new Date(Date.now() + job.options.delay).toISOString();
      }

      queue.jobs.push(job);
      queue.stats.totalJobs++;

      // Sort by priority
      this.sortQueueByPriority(queue);

      console.log(`➕ Job added to queue '${queueName}':`, job.id);
      
      // Cache job for persistence
      await cacheService.set(`job:${job.id}`, job, 3600); // 1 hour TTL
      
      return { success: true, jobId: job.id, job };
    } catch (error) {
      console.error('❌ Error adding job to queue:', error);
      return { success: false, error: error.message };
    }
  }

  sortQueueByPriority(queue) {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    
    queue.jobs.sort((a, b) => {
      const aPriority = priorityOrder[a.options.priority] || 2;
      const bPriority = priorityOrder[b.options.priority] || 2;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }
      
      // Same priority, sort by creation time
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
  }

  async startProcessing() {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    console.log('🚀 Queue processing started');

    // Process queues continuously
    setInterval(async () => {
      await this.processQueues();
    }, 1000); // Check every second

    // Cleanup completed/failed jobs periodically
    setInterval(() => {
      this.cleanupJobs();
    }, 60000); // Cleanup every minute
  }

  async processQueues() {
    for (const [queueName, queue] of this.queues) {
      await this.processQueue(queue);
    }
  }

  async processQueue(queue) {
    try {
      // Check if we can process more jobs
      if (queue.processing.length >= queue.options.maxConcurrentJobs) {
        return;
      }

      // Get next job to process
      const job = this.getNextJob(queue);
      if (!job) {
        return;
      }

      // Move job to processing
      const jobIndex = queue.jobs.indexOf(job);
      if (jobIndex > -1) {
        queue.jobs.splice(jobIndex, 1);
        queue.processing.push(job);
        job.status = 'processing';
        job.startedAt = new Date().toISOString();
        job.attempts++;

        console.log(`🔄 Processing job ${job.id} in queue '${queue.name}'`);

        // Process job asynchronously
        this.executeJob(job, queue).catch(error => {
          console.error(`❌ Error in job execution for ${job.id}:`, error);
        });
      }
    } catch (error) {
      console.error(`❌ Error processing queue '${queue.name}':`, error);
    }
  }

  getNextJob(queue) {
    const now = new Date();
    
    return queue.jobs.find(job => {
      // Check if job is ready to execute (considering delay)
      if (job.executeAt && new Date(job.executeAt) > now) {
        return false;
      }
      
      return true;
    });
  }

  async executeJob(job, queue) {
    const startTime = Date.now();
    
    try {
      // Set timeout for job execution
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Job timeout')), job.options.timeout);
      });

      // Execute job based on queue type
      const jobPromise = this.processJobByType(job);
      
      // Race between job execution and timeout
      const result = await Promise.race([jobPromise, timeoutPromise]);
      
      // Job completed successfully
      const processingTime = Date.now() - startTime;
      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      job.processingTime = processingTime;
      job.result = result;

      // Move to completed
      this.moveJobToCompleted(job, queue);
      
      // Update stats
      queue.stats.completedJobs++;
      this.updateAverageProcessingTime(queue, processingTime);

      console.log(`✅ Job ${job.id} completed in ${processingTime}ms`);
      
    } catch (error) {
      console.error(`❌ Job ${job.id} failed:`, error.message);
      
      job.errors.push({
        message: error.message,
        timestamp: new Date().toISOString(),
        attempt: job.attempts
      });

      // Check if we should retry
      if (job.attempts < job.options.retryAttempts) {
        console.log(`🔄 Retrying job ${job.id} (attempt ${job.attempts + 1}/${job.options.retryAttempts})`);
        
        // Add delay before retry
        job.executeAt = new Date(Date.now() + queue.options.retryDelay).toISOString();
        job.status = 'pending';
        
        // Move back to queue
        this.moveJobBackToQueue(job, queue);
      } else {
        // Job failed permanently
        job.status = 'failed';
        job.failedAt = new Date().toISOString();
        
        // Move to failed
        this.moveJobToFailed(job, queue);
        queue.stats.failedJobs++;
      }
    }
  }

  async processJobByType(job) {
    switch (job.queueName) {
      case 'nft-processing':
        return await this.processNFTJob(job);
      case 'image-processing':
        return await this.processImageJob(job);
      case 'metadata-processing':
        return await this.processMetadataJob(job);
      case 'blockchain-operations':
        return await this.processBlockchainJob(job);
      case 'analytics':
        return await this.processAnalyticsJob(job);
      default:
        throw new Error(`Unknown job type: ${job.queueName}`);
    }
  }

  async processNFTJob(job) {
    // Simulate NFT processing
    console.log('🎨 Processing NFT job:', job.data);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
    
    return {
      success: true,
      message: 'NFT processed successfully',
      data: job.data
    };
  }

  async processImageJob(job) {
    // Simulate image processing
    console.log('🖼️ Processing image job:', job.data);
    
    await new Promise(resolve => setTimeout(resolve, Math.random() * 3000 + 2000));
    
    return {
      success: true,
      message: 'Image processed successfully',
      processedImageUrl: `https://processed.example.com/${job.id}.jpg`
    };
  }

  async processMetadataJob(job) {
    // Simulate metadata processing
    console.log('📄 Processing metadata job:', job.data);
    
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    
    return {
      success: true,
      message: 'Metadata processed successfully',
      metadataUrl: `https://metadata.example.com/${job.id}.json`
    };
  }

  async processBlockchainJob(job) {
    // Simulate blockchain operation
    console.log('⛓️ Processing blockchain job:', job.data);
    
    await new Promise(resolve => setTimeout(resolve, Math.random() * 5000 + 3000));
    
    return {
      success: true,
      message: 'Blockchain operation completed',
      transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`
    };
  }

  async processAnalyticsJob(job) {
    // Simulate analytics processing
    console.log('📊 Processing analytics job:', job.data);
    
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 200));
    
    return {
      success: true,
      message: 'Analytics processed successfully',
      metrics: { processed: true, timestamp: new Date().toISOString() }
    };
  }

  moveJobToCompleted(job, queue) {
    const index = queue.processing.indexOf(job);
    if (index > -1) {
      queue.processing.splice(index, 1);
      queue.completed.push(job);
    }
  }

  moveJobToFailed(job, queue) {
    const index = queue.processing.indexOf(job);
    if (index > -1) {
      queue.processing.splice(index, 1);
      queue.failed.push(job);
    }
  }

  moveJobBackToQueue(job, queue) {
    const index = queue.processing.indexOf(job);
    if (index > -1) {
      queue.processing.splice(index, 1);
      queue.jobs.push(job);
      this.sortQueueByPriority(queue);
    }
  }

  updateAverageProcessingTime(queue, processingTime) {
    const totalCompleted = queue.stats.completedJobs;
    const currentAverage = queue.stats.averageProcessingTime;
    
    queue.stats.averageProcessingTime = 
      ((currentAverage * (totalCompleted - 1)) + processingTime) / totalCompleted;
  }

  cleanupJobs() {
    for (const [queueName, queue] of this.queues) {
      // Keep only last 100 completed jobs
      if (queue.completed.length > 100) {
        queue.completed = queue.completed.slice(-100);
      }
      
      // Keep only last 50 failed jobs
      if (queue.failed.length > 50) {
        queue.failed = queue.failed.slice(-50);
      }
    }
  }

  getQueueStats() {
    const stats = {};
    
    for (const [queueName, queue] of this.queues) {
      stats[queueName] = {
        ...queue.stats,
        pending: queue.jobs.length,
        processing: queue.processing.length,
        completed: queue.completed.length,
        failed: queue.failed.length,
        options: queue.options
      };
    }
    
    return stats;
  }

  async getJob(jobId) {
    // Try to get from cache first
    const cachedJob = await cacheService.get(`job:${jobId}`);
    if (cachedJob) {
      return { success: true, job: cachedJob };
    }

    // Search in all queues
    for (const [queueName, queue] of this.queues) {
      const allJobs = [...queue.jobs, ...queue.processing, ...queue.completed, ...queue.failed];
      const job = allJobs.find(j => j.id === jobId);
      
      if (job) {
        return { success: true, job };
      }
    }

    return { success: false, error: 'Job not found' };
  }
}

// Export singleton instance
module.exports = new QueueService();
