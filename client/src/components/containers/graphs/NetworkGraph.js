import ForceGraph from "force-graph"

const FOCUS_TIME = 1000
const NODE_SIZE = 12

/**
 *
 * @param {HTMLDivElement} container
 * @param {import("../../../sketches/helpers/sketchTypes").INetworkSketchState} state
 */
export function createNetworkGraph(container, state) {
  const gData = {
    nodes: state.people.map((person) => {
      let thumbnail = null
      if (person.thumbnail_url) {
        thumbnail = new Image()
        thumbnail.src = person.thumbnail_url
      }

      return { id: person.name, thumbnail, neighbors: [] }
    }),
    links: [],
  }

  state.people.forEach((person) => {
    Object.keys(person.relationships).forEach((name) => {
      if (!gData.nodes.some((person) => person.id === name)) return
      gData.links.push({
        source: person.name,
        target: name,
      })
    })
  })

  // set neighbors
  gData.links.forEach((link) => {
    const a = gData.nodes.find((node) => node.id === link.source)
    const b = gData.nodes.find((node) => node.id === link.target)
    if (!a || !b) return

    a.neighbors.push(b)
    b.neighbors.push(a)
  })

  // for highlighted on hover
  const highlightNodes = new Set()
  const highlightLinks = new Set()
  let hoverNode = null

  // for adding connections
  let nodeToConnect = null

  const Graph = ForceGraph()(container)
    .graphData(gData)
    .nodeRelSize(NODE_SIZE)
    .nodeCanvasObject((node, ctx) => {
      const { thumbnail, x, y } = node

      // add ring just for highlighted nodes
      if (highlightNodes.has(node)) {
        ctx.beginPath()
        const highlightSize = NODE_SIZE * 1.2

        ctx.rect(
          x - highlightSize / 2,
          y - highlightSize / 2,
          highlightSize,
          highlightSize,
        )
        ctx.fillStyle = node === hoverNode ? "red" : "orange"
        ctx.fill()
      }

      if (thumbnail) {
        /* show profile pictures */
        ctx.drawImage(
          thumbnail,
          x - NODE_SIZE / 2,
          y - NODE_SIZE / 2,
          NODE_SIZE,
          NODE_SIZE,
        )
      } else {
        ctx.beginPath()
        ctx.rect(x - NODE_SIZE / 2, y - NODE_SIZE / 2, NODE_SIZE, NODE_SIZE)
        ctx.fillStyle = "white"
        ctx.fill()
        ctx.strokeStyle = "black"
        ctx.stroke()
      }
    })
    .nodeLabel("id")
    .nodeAutoColorBy("id")
    .linkDirectionalParticles(1)
    .linkDirectionalParticleWidth(1.4)
    .onLinkHover((link) => {
      highlightNodes.clear()
      highlightLinks.clear()

      if (link) {
        highlightLinks.add(link)
        highlightNodes.add(link.source)
        highlightNodes.add(link.target)
      }
    })
    .linkWidth((link) => (highlightLinks.has(link) ? 5 : 1))
    .linkColor((link) => (highlightLinks.has(link) ? "yellow" : "black"))
    .onNodeHover((node) => {
      highlightNodes.clear()
      highlightLinks.clear()
      if (node) {
        highlightNodes.add(node)
        node.neighbors.forEach((neighbor) => highlightNodes.add(neighbor))
        gData.links.forEach((link) => {
          if (link.source === node.id || link.target === node.id)
            highlightLinks.add(link)
        })
      }

      hoverNode = node || null
      container.style.cursor = node ? "-webkit-grab" : null
    })
    .onNodeClick((node) => {
      // TODO: Show modal via Redux dispatch

      /* zoom & center on click */
      Graph.centerAt(node.x, node.y, FOCUS_TIME / 2)
      Graph.zoom(10, FOCUS_TIME)
    })
    .onNodeDragEnd((node) => {
      /* fix at end drag position */
      node.fx = node.x
      node.fy = node.y
    })
    .onBackgroundRightClick(() => {
      // TODO: add a person
      // dispatch Redux state update
      console.log("rc")
    })
    .onNodeRightClick((node) => {
      if (!nodeToConnect) {
        nodeToConnect = node
      } else {
        // TODO: create link in Redux
        gData.links.push({
          source: nodeToConnect.id,
          target: node.id,
        })
        gData.links.push({
          source: node.id,
          target: nodeToConnect.id,
        })
        nodeToConnect = null

        console.log(gData)

        window.location.reload()
      }
    })
  return Graph

  // const NODE_R = 8

  // const highlightNodes = new Set()
  // const highlightLinks = new Set()
  // let hoverNode = null

  // return ForceGraph()(container)
  //   .graphData(gData)
  //   .nodeRelSize(NODE_R)
  //   .onNodeHover((node) => {
  //     highlightNodes.clear()
  //     highlightLinks.clear()
  //     if (node) {
  //       highlightNodes.add(node)
  //       node.neighbors.forEach((neighbor) => highlightNodes.add(neighbor))
  //       node.links.forEach((link) => highlightLinks.add(link))
  //     }

  //     hoverNode = node || null
  //     container.style.cursor = node ? "-webkit-grab" : null
  //   })
  //   .onLinkHover((link) => {
  //     highlightNodes.clear()
  //     highlightLinks.clear()

  //     if (link) {
  //       highlightLinks.add(link)
  //       highlightNodes.add(link.source)
  //       highlightNodes.add(link.target)
  //     }
  //   })
  //   .linkWidth((link) => (highlightLinks.has(link) ? 5 : 1))
  //   .linkDirectionalParticles(4)
  //   .linkDirectionalParticleWidth((link) => (highlightLinks.has(link) ? 4 : 0))
  //   .nodeCanvasObjectMode((node) =>
  //     highlightNodes.has(node) ? "before" : undefined,
  //   )
  //   .nodeCanvasObject((node, ctx) => {
  //     // add ring just for highlighted nodes
  //     ctx.beginPath()
  //     ctx.arc(node.x, node.y, NODE_R * 1.4, 0, 2 * Math.PI, false)
  //     ctx.fillStyle = node === hoverNode ? "red" : "orange"
  //     ctx.fill()
  //   })
}
