import { Box, Button, DropButton, DropProps, Tip } from "grommet"
import * as Icons from "grommet-icons"
import React, { FC, useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { fireFitCanvasEvent } from "../../helpers/customEvents"
import useSmallBreakpoint from "../../hooks/useSmallBreakpoint"
import { deletePerson, scalePerson } from "../../store/networks/actions"
import { IPerson } from "../../store/networks/networkTypes"
import { getCurrentNetworkId } from "../../store/selectors/networks/getCurrentNetwork"
import { getSelectedNodeIds } from "../../store/selectors/ui/getSelectedNodeIds"
import { IApplicationState } from "../../store/store"
import { setSmallMode, setToolbarAction } from "../../store/ui/uiActions"
import { ToolbarAction } from "../../store/ui/uiTypes"
import ToolTipButton from "../ToolTipButton"
import { XYVals } from "./ForceGraphCanvas/networkGraphTypes"

interface IProps {
  isViewingShared: boolean
}
const dropProps: DropProps = { align: { right: "left" } }
function NetworkGraphToolbar({ isViewingShared }: IProps) {
  const dispatch = useDispatch()
  const isSmall = useSmallBreakpoint()
  const currentAction = useSelector(
    (state: IApplicationState) => state.ui.toolbarAction,
  )
  const setAction = (toolbarAction: ToolbarAction) => () => {
    dispatch(setToolbarAction(toolbarAction))
  }
  const selectionAccent: SelectionAccentFunc = (
    action: ToolbarAction,
    color: string = "accent-1",
  ) => (currentAction === action ? color : "light-1")

  return (
    <Box
      direction={isSmall ? "row" : "column"}
      width={isSmall ? "100%" : "48px"}
      height={isSmall ? "48px" : "100%"}
      pad="2rem"
      align="center"
      justify={isSmall ? "center" : "start"}
    >
      <ToolTipButton
        tooltip="View"
        icon={<Icons.View color={selectionAccent("VIEW")} />}
        dropProps={dropProps}
        onClick={setAction("VIEW")}
      />
      <Divider isVertical={isSmall} />
      <ToolTipButton
        tooltip="Select"
        icon={<Icons.Select color={selectionAccent("SELECT")} />}
        dropProps={dropProps}
        onClick={setAction("SELECT")}
      />
      <ToolTipButton
        tooltip="Move"
        icon={<Icons.Pan color={selectionAccent("MOVE")} />}
        dropProps={dropProps}
        onClick={setAction("MOVE")}
      />
      {!isViewingShared && (
        <ToolTipButton
          tooltip="Create"
          icon={<Icons.AddCircle color={selectionAccent("CREATE")} />}
          dropProps={dropProps}
          onClick={setAction("CREATE")}
          isDisabled={isViewingShared}
        />
      )}

      {!isViewingShared && (
        <ToolTipButton
          tooltip="Link"
          icon={<Icons.Connect color={selectionAccent("LINK")} />}
          dropProps={dropProps}
          onClick={setAction("LINK")}
          isDisabled={isViewingShared}
        />
      )}
      <Tip content="Resize" dropProps={dropProps}>
        <DropButton
          icon={<Icons.Expand color={selectionAccent("RESIZE")} />}
          onClick={setAction("RESIZE")}
          dropContent={<ResizeToolbar isHorizontal={isSmall} />}
          dropAlign={{ right: "left" }}
          onBlur={(e) => e.preventDefault()}
        />
      </Tip>

      <DeleteActionButton
        setAction={setAction}
        selectionAccent={selectionAccent}
      />
      <Divider isVertical={isSmall} />
      <SmallModeButton />
      <ToolTipButton
        tooltip="Zoom to fit"
        icon={<Icons.Cluster color="accent-2" />}
        dropProps={dropProps}
        onClick={() => fireFitCanvasEvent()}
      />

      {/*<ToolTipButton
        tooltip="Pin/Unpin"
        icon={<Icons.Pin color={accentIfSelected("PIN")} />}
        dropProps={dropProps}
        onClick={setAction("PIN")}
      /> */}
    </Box>
  )
}

export default NetworkGraphToolbar

type SelectionAccentFunc = (action: ToolbarAction, color?: string) => string
type SetToolbarActionFunc = (toolbarAction: ToolbarAction) => () => void

interface IDeleteActionProps {
  setAction: SetToolbarActionFunc
  selectionAccent: SelectionAccentFunc
}
function DeleteActionButton({
  setAction,
  selectionAccent,
}: IDeleteActionProps) {
  const dispatch = useDispatch()
  const currentNetworkId = useSelector(getCurrentNetworkId)
  const selectedNodeIds = useSelector(getSelectedNodeIds)

  const handleDeleteAction = async () => {
    setAction("DELETE")()
    if (!currentNetworkId) return

    if (selectedNodeIds.length > 0) {
      const doContinue = window.confirm(
        `Delete ${selectedNodeIds.length} selected nodes?`,
      )
      if (!doContinue) return

      for (const nodeId of selectedNodeIds) {
        dispatch(deletePerson(currentNetworkId, nodeId))
      }

      return
    }
  }

  return (
    <ToolTipButton
      tooltip="Delete"
      icon={
        <Icons.Trash color={selectionAccent("DELETE", "status-critical")} />
      }
      dropProps={dropProps}
      onClick={handleDeleteAction}
    />
  )
}

function SmallModeButton() {
  const dispatch = useDispatch()
  const isSmallMode = useSelector(
    (state: IApplicationState) => state.ui.isSmallMode,
  )
  const toggleSmallMode = () => {
    dispatch(setSmallMode(!isSmallMode))
  }

  return (
    <ToolTipButton
      tooltip={`${isSmallMode ? "Exit simple view" : "Enter simple view"}`}
      icon={
        isSmallMode ? (
          <Icons.EmptyCircle color="accent-2" />
        ) : (
          <Icons.Image color="accent-2" />
        )
      }
      dropProps={dropProps}
      onClick={toggleSmallMode}
    />
  )
}

const Divider: FC<{ isVertical: boolean }> = ({ isVertical }) => {
  return (
    <div
      role="divider"
      style={{
        backgroundColor: "white",
        width: isVertical ? 1 : 24,
        height: isVertical ? 24 : 1,
      }}
    />
  )
}

interface IResizeToolbarProps {
  isHorizontal: boolean
  [key: string]: any
}

const ResizeToolbar: FC<IResizeToolbarProps> = (props) => {
  const dispatch = useDispatch()
  const currentNetworkId = useSelector(
    (state: IApplicationState) => state.networks.currentNetwork?.id,
  )
  const people = useSelector(
    (state: IApplicationState) => state.networks.currentNetwork?.people,
  )
  const selectedNodeIds = useSelector(
    (state: IApplicationState) => state.ui.selectedNodeIds,
  )

  const [scaleInput, scaleInputSet] = useState("100%")

  const selectedPeople = selectedNodeIds
    .map((id) => people && people.find((p) => p.id === id))
    .filter((p) => p !== undefined) as IPerson[]

  // TODO: Options to resize horizontally, vertically, and both
  const value: string =
    selectedPeople.length === 1
      ? getScalePercentage(selectedPeople[0].scaleXY ?? { x: 1, y: 1 })
      : "-"

  useEffect(() => {
    scaleInputSet(value)
  }, [value])

  // TODO: allow direct percentage editing
  // useEffect(()=>{
  // }, [scaleInput])

  if (!currentNetworkId || !people || selectedNodeIds.length === 0) return null

  const handleChangeSize = (change: "increment" | "decrement") => async () => {
    const resizePromise = selectedPeople.map(async (p) => {
      try {
        const { x, y } = p.scaleXY ? p.scaleXY : { x: 1, y: 1 }
        const newScale: XYVals =
          change === "increment"
            ? {
                x: changeAndFix("increment", x),
                y: changeAndFix("increment", y),
              }
            : {
                x: changeAndFix("decrement", x),
                y: changeAndFix("decrement", y),
              }
        if (newScale.x < 0 || newScale.y < 0) return

        return dispatch(scalePerson(currentNetworkId, p.id, newScale))
      } catch (error) {
        console.error(error)
      }
    })

    await Promise.all(resizePromise)
  }

  return (
    <Box
      direction={props.isHorizontal ? "row" : "column"}
      overflow="hidden"
      {...props}
    >
      <Button
        icon={<Icons.Add width="48px" height="48px" />}
        onClick={handleChangeSize("increment")}
      />
      {/* TODO: Directly edit input */}
      <input
        type="text"
        value={value}
        // value={scaleInput}
        // onChange={(e) => {
        //   const isPercentage = Number(e.target.value.replace("%", ""))
        //   if (!isPercentage) return
        //   scaleInputSet(e.target.value)
        // }}
        style={{
          display: "block",
          width: "48px",
          height: "48px",
          textAlign: "center",
        }}
      />
      <Button
        icon={<Icons.Subtract width="48px" height="48px" />}
        onClick={handleChangeSize("decrement")}
      />
    </Box>
  )
}

const INCREMENT = 0.1
function changeAndFix(
  change: "increment" | "decrement",
  value: number,
  fixTo: number = 2,
) {
  const changed = change === "increment" ? value + INCREMENT : value - INCREMENT
  const fixed = changed.toFixed(fixTo)
  return Number(fixed)
}

function getScalePercentage(scaleXY: XYVals): string {
  // e.g. 4.8999999999999995 => 4.90
  const decimal = Number(scaleXY.x.toFixed(2))

  // e.g. 4.90 => 490%
  return `${Math.round(decimal * 100)}%`
}
