declare module 'lucide-react' {
  import * as React from 'react';
  
  export interface IconProps extends React.SVGProps<SVGSVGElement> {
    size?: string | number;
    color?: string;
    strokeWidth?: string | number;
  }
  
  export type Icon = React.FC<IconProps>;
  
  export const Wallet: Icon;
  export const Crown: Icon;
  export const History: Icon;
  export const Image: Icon;
  export const Loader2: Icon;
  export const Upload: Icon;
  export const Plus: Icon;
  export const X: Icon;
  export const ExternalLink: Icon;
}
