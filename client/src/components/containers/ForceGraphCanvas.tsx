import { ForceGraphInstance } from "force-graph"
import React from "react"
import { CSSProperties } from "styled-components"
import { ICurrentNetwork } from "../../store/networks/networkTypes"
import Canvas from "../Canvas"
import { createNetworkGraph } from "./graphs/NetworkGraph"

const ForceGraphCanvas: React.FC<IProps> = (props) => {
  /* create a ref for forwarding to the Canvas presentational component */
  const canvasRef = React.createRef<HTMLDivElement>()

  // ==- Load the P5 Sketch -== //
  React.useEffect(() => {
    if (!props.state) return

    const container = canvasRef.current

    if (container) {
      /* TODO: remove when anonymous networks are implemented 
      Whether the graph Dispatches Redux actions or not */
      const isDisconnected = Boolean(props.disconnected)

      /* set canvas width and height based on container dimensions */
      const forceGraph = createNetworkGraph(
        container,
        props.state,
        isDisconnected,
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
  }, [props])

  return <Canvas id={props.id} ref={canvasRef} style={props.style} />
}

export default React.memo(ForceGraphCanvas)

// ==- TYPE DEFINITIONS -== //
interface IProps {
  style?: CSSProperties
  id: string
  state: ICurrentNetwork | null
  disconnected?: boolean
}
