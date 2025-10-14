import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

export function PixelHeartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 13 13"
      shapeRendering="crispEdges"
      className={cn("fill-current", props.className)}
      {...props}
    >
      <path
        stroke="#000"
        strokeWidth="1"
        d="M3 1h1v1h1v1h1V2h1V1h1v1h1v1h1v3h-1v1h-1v1h-1v1H8v1H5v-1H4v-1H3v-1H2v-1H1V6h1V3h1V2h1V1Z"
      />
      <path
        d="M3 2h1v1h1V2h1v1h1V2h1v1h1v3h-1v1h-1v1H8v1H5v-1H4V7H3V6H2V3h1V2Z"
      />
    </svg>
  );
}
