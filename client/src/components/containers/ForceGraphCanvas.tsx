import React from "react"

import Canvas from "../Canvas"
import { CSSProperties } from "styled-components"
import { createNetworkGraph } from "./graphs/NetworkGraph"
import { ForceGraphInstance } from "force-graph"

const ForceGraphCanvas: React.FC<IProps> = (props) => {
  /* create a ref for forwarding to the Canvas presentational component */
  const canvasRef = React.createRef<HTMLDivElement>()

  // ==- Load the P5 Sketch -== //
  React.useEffect(() => {
    const container = canvasRef.current

    if (container) {
      /* set canvas width and height based on container dimensions */

      const forceGraph = createNetworkGraph(
        container,
        props.state,
      ) as ForceGraphInstance

      const handleResize = () => {
        const w = container.clientWidth
        const h = container.clientHeight
        forceGraph.width(w)
        forceGraph.height(h)
        forceGraph.centerAt(0, 0, 500)
      }
      window.addEventListener("resize", handleResize)

      return () => {
        window.removeEventListener("resize", handleResize)
      }
    }
  }, [])

  return <Canvas id={props.id} ref={canvasRef} style={props.style} />
}

export default ForceGraphCanvas

// ==- TYPE DEFINITIONS -== //
interface IProps {
  style?: CSSProperties
  id: string
  state: any
}
