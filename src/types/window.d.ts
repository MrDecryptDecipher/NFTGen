interface Window {
  ethereum?: any;
  nijaHeartbeatInterval?: NodeJS.Timeout;
  Sentry?: {
    init: (config: any) => void;
    captureException: (error: any) => void;
    captureMessage: (message: string) => void;
  };
  __SENTRY__?: any;
} 