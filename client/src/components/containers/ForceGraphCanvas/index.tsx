import deepEqual from "deep-equal"
import { ForceGraphInstance, LinkObject } from "force-graph"
import React, { useEffect, useRef } from "react"
import { useDispatch, useSelector } from "react-redux"
import { Dispatch } from "redux"
import { CUSTOM_EVENT_NAMES } from "../../../helpers/customEvents"
import { ICurrentNetwork, IPerson } from "../../../store/networks/networkTypes"
import { IApplicationState } from "../../../store/store"
import { setToolbarAction, zoomToPerson } from "../../../store/ui/uiActions"
import Canvas from "../../Canvas"
import {
  addCustomListeners,
  clearHighlights,
  clearNodeToConnect,
  clearSelected,
  createLinksByRelationships,
  createNetworkGraph,
  createPersonNode,
  highlightNode,
  setNodeNeighborsAndLinks,
  sortNodesBySize,
} from "./NetworkGraph"
import { IForceGraphData, IPersonNode } from "./networkGraphTypes"

const ForceGraphCanvas: React.FC<IProps> = ({
  currentNetwork,
  id: graphId,
  style,
}) => {
  const canvasRef = useRef<HTMLDivElement>()
  const forceGraphRef = useRef<ForceGraphInstance | undefined>()
  const existingPeopleIdsRef = useRef<Set<string>>(new Set<string>())
  const existingPeopleIds = existingPeopleIdsRef.current

  const clearListenersRef = useRef<(() => void) | null>(null)

  // Global state tracking a person to zoom-in on
  const dispatch: Dispatch<any> = useDispatch()
  const personIdToZoom = useSelector(
    (state: IApplicationState) => state.ui.personInZoom,
  )
  const toolbarAction = useSelector(
    (state: IApplicationState) => state.ui.toolbarAction,
  )

  useEffect(() => {
    const Graph = forceGraphRef.current
    if (!Graph) return
    clearNodeToConnect() // Stops linking (if in the middle of a linking) -- this prevents the link line from showing during other toolbar actions
    clearHighlights() // Clears any lingering highlights
    dispatch(zoomToPerson(null))

    switch (toolbarAction) {
      case "MOVE": {
        Graph.enablePointerInteraction(true)
        Graph.enableNodeDrag(true)
        break
      }

      default: {
        Graph.enablePointerInteraction(true)
        Graph.enableNodeDrag(false)
      }
    }
  }, [toolbarAction, forceGraphRef])

  // ==- Instantiate the Force Graph -== //
  const renderForceGraph = () => {
    if (forceGraphRef.current) destroyForceGraph()
    if (!canvasRef.current || !currentNetwork) return

    // Add each person's ID to the existingPeopleIds set -- this is to track existing nodes while we dynamically add new nodes
    existingPeopleIds.clear()
    currentNetwork.people.forEach((n) => existingPeopleIds.add(n.id))

    forceGraphRef.current = createNetworkGraph(
      canvasRef.current,
      currentNetwork,
    ) as ForceGraphInstance

    // Add listeners
    // Store the cleanup function in a ref for use in destroyForceGraph()
    // the nested canvas is created by the force graph; not the same as the container
    const forceGraphNestedCanvas = canvasRef.current.querySelector("canvas")
    if (forceGraphNestedCanvas) {
      clearListenersRef.current = addCustomListeners(
        forceGraphNestedCanvas,
        forceGraphRef.current,
      )
    }

    handleResize()
    window.removeEventListener(CUSTOM_EVENT_NAMES.resize, handleResize)
    window.addEventListener(CUSTOM_EVENT_NAMES.resize, handleResize)

    window.removeEventListener(CUSTOM_EVENT_NAMES.fit, handleFitForceGraph)
    window.addEventListener(CUSTOM_EVENT_NAMES.fit, handleFitForceGraph)
  }

  function handleResize() {
    const currentForceGraph = forceGraphRef.current
    const currentCanvasContainer = canvasRef.current
    if (!currentForceGraph || !currentCanvasContainer) return

    const { width, height } = currentCanvasContainer.getBoundingClientRect()

    currentForceGraph.width(width).height(height)
  }

  function handleFitForceGraph() {
    const currentForceGraph = forceGraphRef.current
    if (!currentForceGraph) return

    currentForceGraph.zoomToFit(250)
  }

  // Destroy the graph and related listeners to prevent memory leaks
  function destroyForceGraph() {
    window.removeEventListener(CUSTOM_EVENT_NAMES.resize, handleResize)
    if (clearListenersRef.current !== null) clearListenersRef.current()
    forceGraphRef.current?._destructor()
    forceGraphRef.current = undefined
  }

  // Render force graph on container mount or when we switch to a different network
  useEffect(() => {
    clearSelected()
    clearHighlights()
    renderForceGraph()

    dispatch(setToolbarAction("VIEW"))

    return () => {
      destroyForceGraph()
    }
  }, [canvasRef, currentNetwork?.id])

  // Update the existing force graph when people or groups change
  useEffect(() => {
    if (!forceGraphRef.current || !currentNetwork) return
    const forceGraph = forceGraphRef.current
    const people = currentNetwork.people

    const { links, nodes } = forceGraphRef.current.graphData() as {
      links: LinkObject[]
      nodes: IPersonNode[]
    }

    // This will be modified if people are added or removed
    const updatedGraphData: IForceGraphData = {
      nodes,
      links: [],
    }

    // Reusable function to update the graph using the updatedGraphData object
    const updateGraph = () => {
      sortNodesBySize(updatedGraphData)
      people.forEach(createLinksByRelationships(updatedGraphData))

      // Refresh links and neighbors for each node (This is for highlighting)
      updatedGraphData.nodes.forEach((node) => {
        node.neighbors = []
        node.links = [] // These links are different from the graphData links, which handle the actual drawn links
      })
      updatedGraphData.links.forEach(setNodeNeighborsAndLinks(updatedGraphData))

      // Update the force graph!
      forceGraph.graphData(updatedGraphData)

      // Pin nodes at a delay -- Force-Graph seems to reset fx and fy for data upon re-render
      const pinNodes = () => {
        forceGraph.graphData().nodes.forEach((n, index) => {
          if (!n) return

          const pin = updatedGraphData.nodes[index]?.pinXY
          if (!pin) return

          n.fx = pin.x
          n.fy = pin.y
        })
      }
      setTimeout(pinNodes, 10)
    }

    const addPeopleToGraph = () => {
      // Find the newly added person(s) -- they shouldn't be in the existingPeopleIds set
      const newPeople = people.filter((p) => !existingPeopleIds.has(p.id))

      // Add the new people to the existingPeopleIds set
      newPeople.forEach((p) => existingPeopleIds.add(p.id))

      // Create person nodes out of the new people. These nodes will be added to the force graph.
      const newPersonNodes = newPeople.map(createPersonNode)
      updatedGraphData.nodes = [...nodes, ...newPersonNodes]

      // No links are created when new people are added
      //

      updateGraph()

      // This prevents the first node from being created off screen:
      if (updatedGraphData.nodes.length === 1) {
        setTimeout(() => {
          const node = updatedGraphData.nodes[0]
          forceGraph.centerAt(node.x, node.y, 250)
        }, 100)
      }
    }

    const removePeopleFromGraph = () => {
      const wasRemoved = (id: string) => !people.some((p) => p.id === id)
      const deletedPeopleIds = Array.from(existingPeopleIds).filter(wasRemoved)

      const removeFromExisting = (id: string) => existingPeopleIds.delete(id)
      deletedPeopleIds.forEach(removeFromExisting)

      const keepIfExisting = (n: IPersonNode) =>
        !deletedPeopleIds.includes(n.id)
      const nodesWithoutRemoved = nodes.filter(keepIfExisting)
      updatedGraphData.nodes = nodesWithoutRemoved

      // Update the graph
      updateGraph()
    }

    const rerenderUpdatedPeopleInGraph = () => {
      // Get nodes whose changes need to be re-rendered in the Force Graph
      const updatedNodes = updatedGraphData.nodes
        .map(asUpdatedNode)
        .filter((n) => n !== null) as IPersonNode[]

      updatedNodes.forEach(replaceUpdatedInGraph)
      updateGraph()

      // #region rerenderUpdatedPeopleInGraph: HELPERS
      function asUpdatedNode(n: IPersonNode) {
        // Get the node from the people props field
        const personFromProps = people.find((p) => p.id === n.id)
        if (!personFromProps) return null // The node is missing? Something went wrong. Return null.

        // Create a force-graph node out of the person's data
        const nodeFromProps = createPersonNode(personFromProps)

        // Check if the node's relationships field is different from the props node's relationships
        const didRelationshipsChange = !deepEqual(
          nodeFromProps.relationships,
          n.relationships,
        )

        const didThumbnailChange =
          nodeFromProps.thumbnail?.src !== n.thumbnail?.src
        const didNameChange = nodeFromProps.name !== n.name
        const didPinChange = !deepEqual(nodeFromProps.pinXY, n.pinXY)
        const didScaleChange = !deepEqual(nodeFromProps.scaleXY, n.scaleXY)
        const didBackgroundToggle =
          nodeFromProps.isBackground !== n.isBackground
        const didIsGroupToggle = nodeFromProps.isGroup !== n.isGroup
        const didBackgroundColorChange =
          nodeFromProps.backgroundColor !== n.backgroundColor
        const didTextColorChange = nodeFromProps.textColor !== n.textColor
        const didHideNameTagChange =
          nodeFromProps.doHideNameTag !== n.doHideNameTag

        const doUpdate =
          didRelationshipsChange ||
          didThumbnailChange ||
          didNameChange ||
          didPinChange ||
          didScaleChange ||
          didBackgroundToggle ||
          didIsGroupToggle ||
          didBackgroundColorChange ||
          didTextColorChange ||
          didHideNameTagChange
        if (!doUpdate) return null

        // Merge the new node and previous node. New node properties override existing ones!
        const mergedNode = { ...n, ...nodeFromProps }

        // Map to the updated node
        return mergedNode
      }

      function replaceUpdatedInGraph(n: IPersonNode) {
        const indexToReplace = updatedGraphData.nodes.findIndex(
          (node) => node.id === n.id,
        )

        updatedGraphData.nodes[indexToReplace] = n
      }

      // #endregion rerenderUpdatedPeopleInGraph: HELPERS
    }

    const peopleLen = people.length
    const existingLen = existingPeopleIds.size

    if (peopleLen > existingLen) {
      addPeopleToGraph()
    } else if (peopleLen < existingLen) {
      removePeopleFromGraph()
    } else if (peopleLen === existingLen) {
      // #people didn't change; relationship reason, thumbnail, or pinXY changed
      rerenderUpdatedPeopleInGraph()
    }
  }, [currentNetwork?.people])

  // Zoom in on a person node
  useEffect(() => {
    if (!personIdToZoom || !forceGraphRef.current) {
      clearHighlights()
      return
    }

    // Get the node to zoom in on
    const forceGraph = forceGraphRef.current
    const nodes = forceGraph.graphData().nodes
    const nodeToZoom = nodes.find((n) => n.id === personIdToZoom)

    if (!nodeToZoom) {
      // Clear the zoom global state if the node doesn't exist
      dispatch(zoomToPerson(null))
      return
    } else {
      const { x, y } = nodeToZoom
      if (x === undefined || y === undefined) return

      forceGraph.centerAt(x, y, 250)
      clearHighlights()
      highlightNode(nodeToZoom)
    }
  }, [personIdToZoom])

  return <Canvas id={graphId} ref={canvasRef} style={style} />
}

export default React.memo(ForceGraphCanvas, (prevProps, nextProps) => {
  const prevCurrentNetwork = prevProps.currentNetwork
  const nextCurrentNetwork = nextProps.currentNetwork

  const areNumPeopleSame =
    prevCurrentNetwork?.personIds.length ===
    nextCurrentNetwork?.personIds.length

  // Rerender if the "people" names, relationships, thumbnail, pinXY, or scaleXY changed
  const toCheckParams = ({
    id,
    name,
    relationships,
    thumbnailUrl,
    pinXY,
    scaleXY,
    isBackground,
    isGroup,
    backgroundColor,
    textColor,
    doHideNameTag,
  }: IPerson) => ({
    id,
    name,
    relationships,
    thumbnail: thumbnailUrl,
    pinXY,
    scaleXY,
    isBackground,
    isGroup,
    backgroundColor,
    textColor,
    doHideNameTag,
  })
  const arePeopleSame = deepEqual(
    prevCurrentNetwork?.people.map(toCheckParams),
    nextCurrentNetwork?.people.map(toCheckParams),
  )

  const skipRerender = areNumPeopleSame && arePeopleSame
  return skipRerender
})

interface IProps {
  currentNetwork: ICurrentNetwork | null
  [key: string]: any
}
