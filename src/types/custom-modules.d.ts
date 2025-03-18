declare module '@wagmi/connectors/injected' {
  /* Minimal type declarations for InjectedConnector */
  export class InjectedConnector {
    constructor(options: any);
  }

  export {};
}

declare module 'process/browser' {
  const process: NodeJS.Process;
  export default process;
} 