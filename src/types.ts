export interface Application {
  id: string;
  name: string;
  api_key: string;
  environment: 'development' | 'sandbox' | 'production';
  created_at: string;
  rate_limit?: number;
  webhook_url?: string;
  webhook_secret?: string;
  webhook_active?: boolean;
  branding?: {
    primaryColor?: string;
    logoUrl?: string;
    senderName?: string;
  };
}

export interface Provider {
  id: string;
  name: string;
  channel: 'email' | 'sms' | 'whatsapp' | 'in_app';
  config: Record<string, any>;
  priority: number;
  is_active: boolean;
  health_status: 'healthy' | 'degraded' | 'unreachable';
  created_at: string;
  uptime_pct?: number;
  latency_ms?: number;
  success_count?: number;
  failure_count?: number;
  active_connections?: number;
}

export interface Template {
  id: string;
  name: string;
  subject: string;
  content: string;
  channel: 'email' | 'sms' | 'whatsapp' | 'in_app';
  variables: string[];
  status: 'draft' | 'published';
  version: number;
  created_at: string;
}

export interface NotificationLog {
  id: string;
  application_name?: string;
  recipient: string;
  channel: 'email' | 'sms' | 'whatsapp' | 'in_app';
  template_name: string;
  variables_used: Record<string, any>;
  status: 'pending' | 'sent' | 'failed' | 'retrying';
  error_message?: string;
  provider_used?: string;
  retry_count: number;
  created_at: string;
  latency_ms?: number;
  correlation_id?: string;
  queued_at?: string;
  worker_picked_at?: string;
  provider_accepted_at?: string;
  delivered_at?: string;
}

export interface SystemConfig {
  key: string;
  value: string;
  updated_at: string;
}

export interface EventRegistryEntry {
  id: string;
  name: string;
  app_id: string;
  variables: string[];
  priority: 'low' | 'normal' | 'high' | 'critical';
  retry_policy: {
    max_retries: number;
    backoff_factor: number;
    failover_channel?: string;
  };
  created_at: string;
}

export interface QueueState {
  name: string;
  status: 'active' | 'paused';
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  processing_time_ms: number;
}

export interface CredentialVaultSecret {
  key: string;
  secret_value: string;
  description: string;
  version: number;
  updated_at: string;
}

export interface AnalyticsSummary {
  totalCount: number;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
  deliveryRate: number;
  channelDistribution: { channel: string; count: number }[];
  dailyMetrics: { date: string; sent: number; failed: number }[];
  providerHealth: { provider: string; status: string; successRate: number }[];
  topTemplates: { name: string; count: number }[];
}

