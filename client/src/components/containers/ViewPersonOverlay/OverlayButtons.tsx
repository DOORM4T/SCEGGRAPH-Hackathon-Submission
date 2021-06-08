import { Box, Button, DropButton, Heading, List, Tip } from "grommet"
import * as Icons from "grommet-icons"
import React, { Dispatch } from "react"
import { useDispatch, useSelector } from "react-redux"
import { fireUnsavedChangeEvent } from "../../../helpers/unsavedChangeEvent"
import useGetPaths from "../../../hooks/useGetPaths"
import {
  connectPeople,
  deletePerson as deletePersonById,
  disconnectPeople,
  scalePerson,
  setIsGroup,
  toggleBackgroundNode,
} from "../../../store/networks/actions"
import { IPerson, IRelationships } from "../../../store/networks/networkTypes"
import {
  getCurrentNetworkId,
  getCurrentNetworkPeople,
} from "../../../store/selectors/networks/getCurrentNetwork"
import { getIsViewingShared } from "../../../store/selectors/ui/getIsViewingShared"
import {
  getPersonInFocusId,
  getPersonInFocusName,
  getPersonInFocusRelationships,
} from "../../../store/selectors/ui/getPersonInFocusData"
import { togglePersonOverlay } from "../../../store/ui/uiActions"
import SearchAndCheckMenu from "../../SearchAndCheckMenu"
import ToolTipButton from "../../ToolTipButton"

//                 //
// -== BUTTONS ==- //
//                 //
interface IRelationshipOption {
  id: string
  name: string
  isConnected: boolean
  currentRelationships: IRelationships
}

interface IOverlayButtonProps {
  isEditing: boolean
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>
}
const OverlayButtons: React.FC<IOverlayButtonProps> = (props) => {
  const dispatch: Dispatch<any> = useDispatch()
  const currentNetworkId = useSelector(getCurrentNetworkId)
  const currentPersonId = useSelector(getPersonInFocusId)
  const currentPersonRelationships = useSelector(getPersonInFocusRelationships)
  const currentPersonName = useSelector(getPersonInFocusName)
  const currentNetworkPeople = useSelector(getCurrentNetworkPeople)
  const groups = currentNetworkPeople.filter((p) => p.isGroup)

  const { getPaths, showPaths } = useGetPaths()

  const currentPerson = currentNetworkPeople.find(
    (p) => p.id === currentPersonId,
  )
  const personScaleXY = currentPerson?.scaleXY || { x: 1, y: 1 }
  const isPersonABackgroundNode = currentPerson?.isBackground || false
  const isPersonAGroupNode = currentPerson?.isGroup || false

  // Connection drop-button ref -- used to trigger a click to close the menu
  const connectPeopleDropButtonRef = React.useRef<any>()
  const handleCloseConnectionMenu = () => {
    if (!connectPeopleDropButtonRef) return
    const btn = connectPeopleDropButtonRef.current as HTMLButtonElement
    btn.click()
    setTimeout(() => {
      btn.blur()
    }, 10)
  }

  // Groups drop-button ref -- used to trigger a click to close the menu
  const manageGroupsDropButtonRef = React.useRef<any>()
  const handleCloseGroupsMenu = () => {
    if (!manageGroupsDropButtonRef) return
    const btn = manageGroupsDropButtonRef.current as HTMLButtonElement
    btn.click()
    setTimeout(() => {
      btn.blur()
    }, 10)
  }

  const isViewingShared = useSelector(getIsViewingShared) // Used to hide the edit mode button if true

  /* Do not render if no network or person is selected, or if in sharing mode */
  if (
    !currentNetworkId ||
    !currentPersonId ||
    (isViewingShared && props.isEditing)
  )
    return null

  /**
   * Delete a person by their ID
   * @param id
   */
  const deletePerson = (id: string) => async () => {
    /* Confirm deletion */
    const doDelete = window.confirm(
      `Delete ${currentPersonName}? This action cannot be reversed.`,
    )
    if (!doDelete) return

    /* Close the Person overlay */
    dispatch(togglePersonOverlay(false))

    /* Delete the person */
    try {
      await dispatch(deletePersonById(currentNetworkId, id))
    } catch (error) {
      console.error(error)
    }
  }

  // Button for entering view mode
  const viewModeButton = (
    <ToolTipButton
      tooltip="View mode"
      icon={<Icons.View color="status-ok" />}
      aria-label="Viewer mode"
      onClick={() => {
        /* If there are unsaved changes, ask the user to confirm before switching modes */
        const doContinue = fireUnsavedChangeEvent()
        if (!doContinue) return

        /* Switch away from edit mode to view mode */
        props.setIsEditing(false)
      }}
    />
  )

  // Button for entering edit mode
  const editModeButton = (
    <ToolTipButton
      tooltip="Edit mode"
      id="edit-button"
      icon={<Icons.Edit color="neutral-3" />}
      aria-label="Edit information"
      onClick={() => props.setIsEditing(true)}
    />
  )

  // Button for deleting the current person
  const deleteCurrentPersonButton = (
    <ToolTipButton
      tooltip="Delete"
      id="delete-person-button"
      icon={<Icons.Trash color="status-critical" />}
      aria-label="Delete person"
      onClick={deletePerson(currentPersonId)}
    />
  )

  /* IDs of people related to the selected person */
  const currentRelationshipIds: string[] = currentPersonRelationships
    ? Object.keys(currentPersonRelationships)
    : []

  /* List of possible people to connect to */
  const relationshipOptions = currentNetworkPeople
    .map((p) => {
      /* Exclude already-related people */
      const isAlreadyRelated = currentRelationshipIds.includes(p.id)
      const isSelf = p.id === currentPersonId
      if (!isSelf) {
        const relOption: IRelationshipOption = {
          id: p.id,
          name: p.name,
          isConnected: isAlreadyRelated,
          currentRelationships: p.relationships,
        }
        return relOption
      } else {
        return {}
      }
    })
    .filter((item) => {
      /* Exclude empty entries */
      const hasData = Object.keys(item).length !== 0
      return hasData
    }) as IRelationshipOption[]

  const toggleConnection = (id: string, isConnected: boolean) => async () => {
    // Connect to the person the current person is not already connected to them
    const doConnect = !isConnected

    try {
      // Add connection
      if (doConnect) {
        await dispatch(
          connectPeople(currentNetworkId, {
            p1Id: currentPersonId,
            p2Id: id,
          }),
        )
      } else {
        // Remove connection
        await dispatch(
          disconnectPeople(currentNetworkId, {
            p1Id: currentPersonId,
            p2Id: id,
          }),
        )
      }
    } catch (error) {
      console.error(error)
    }
  }

  // Button that opens a menu for connecting to/disconnecting from other people
  const ConnectPeopleDropButton = (
    <Tip content="Manage connections">
      <DropButton
        id="manage-relationships-drop-button"
        icon={<Icons.Connect color="neutral-3" />}
        aria-label="Create connection"
        hoverIndicator
        dropAlign={{ left: "right" }}
        ref={connectPeopleDropButtonRef}
        dropContent={
          <React.Fragment>
            <Box direction="row" justify="center">
              <Heading level={4} margin={{ left: "auto" }} textAlign="center">
                Manage Connections
              </Heading>
              <Button
                onClick={handleCloseConnectionMenu}
                icon={<Icons.Close />}
                aria-label="Close connection management menu"
                margin={{ left: "auto" }}
                hoverIndicator
              />
            </Box>
            <SearchAndCheckMenu
              defaultOptions={relationshipOptions}
              idField="id"
              nameField="name"
              isCheckedFunction={(arg: IRelationshipOption) => arg.isConnected}
              toggleOption={toggleConnection}
              maxHeight="350px"
            />
          </React.Fragment>
        }
      />
    </Tip>
  )

  const isPersonInGroup = (group: IPerson) =>
    group.relationships[currentPersonId] !== undefined

  const toggleGroup = (groupId: string, isInGroup: boolean) => async () => {
    // Add to the group if they're not already in it
    const doGroup = !isInGroup

    try {
      if (doGroup) {
        // Toggle the person in the group in global state using a custom Redux action
        await dispatch(
          connectPeople(currentNetworkId, {
            p1Id: currentPersonId,
            p2Id: groupId,
          }),
        )
      } else {
        await dispatch(
          disconnectPeople(currentNetworkId, {
            p1Id: currentPersonId,
            p2Id: groupId,
          }),
        )
      }
    } catch (error) {
      console.error(error)
    }
  }

  // Button that opens a menu for managing the current person's groups
  const ManageGroupsDropButton = (
    <Tip content="Manage groups">
      <DropButton
        id="manage-groups-drop-button"
        icon={<Icons.Group color="accent-1" />}
        aria-label="Manage groups"
        hoverIndicator
        dropAlign={{ left: "right" }}
        ref={manageGroupsDropButtonRef}
        dropContent={
          <React.Fragment>
            <Box direction="row" justify="center">
              <Heading level={4} margin={{ left: "auto" }} textAlign="center">
                Manage Groups
              </Heading>
              <Button
                onClick={handleCloseGroupsMenu}
                icon={<Icons.Close />}
                aria-label="Close group management menu"
                margin={{ left: "auto" }}
                hoverIndicator
              />
            </Box>
            <SearchAndCheckMenu
              // CANNOT add a group node to its own group
              defaultOptions={groups.filter((g) => g.id !== currentPersonId)}
              idField="id"
              nameField="name"
              isCheckedFunction={isPersonInGroup}
              toggleOption={toggleGroup}
              itemBgColorField="backgroundColor"
              itemTextColorField="textColor"
              pad="small"
              maxHeight="350px"
            />
          </React.Fragment>
        }
      />
    </Tip>
  )

  const handleScalePerson = async () => {
    const x = Number(window.prompt("x", String(personScaleXY.x)))
    if (!x) return

    const y = Number(window.prompt("y", String(personScaleXY.y)))
    if (!y) return

    try {
      await dispatch(scalePerson(currentNetworkId, currentPersonId, { x, y }))
    } catch (error) {
      console.error(error)
    }
  }

  const scalePersonButton = (
    <ToolTipButton
      tooltip="Resize in graph"
      id="scale-person-button"
      icon={<Icons.Expand color="accent-3" />}
      onClick={handleScalePerson}
    />
  )

  const togglePersonAsBackground = async () => {
    try {
      await dispatch(
        toggleBackgroundNode(
          currentNetworkId,
          currentPersonId,
          !isPersonABackgroundNode,
        ),
      )
    } catch (error) {
      console.error(error)
    }
  }

  const toggleBackgroundNodeButton = (
    <ToolTipButton
      tooltip={
        isPersonABackgroundNode
          ? "Turn into normal node"
          : "Turn into background node"
      }
      id="toggle-background-node-button"
      icon={
        isPersonABackgroundNode ? (
          <Icons.DocumentImage color="accent-4" />
        ) : (
          <Icons.DocumentUser color="accent-4" />
        )
      }
      onClick={togglePersonAsBackground}
    />
  )

  const togglePersonAsGroup = async () => {
    try {
      await dispatch(
        setIsGroup(currentNetworkId, currentPersonId, !isPersonAGroupNode),
      )
    } catch (error) {
      console.error(error)
    }
  }
  const toggleGroupNodeButton = (
    <ToolTipButton
      tooltip={
        isPersonAGroupNode ? "Turn into non-group node" : "Turn into group node"
      }
      id="toggle-background-node-button"
      icon={
        isPersonAGroupNode ? (
          <Icons.Folder color="status-ok" />
        ) : (
          <Icons.Folder color="status-critical" />
        )
      }
      onClick={togglePersonAsGroup}
    />
  )

  const RelativeToButton = (
    <Tip content="Relative to...">
      <DropButton
        id="relative-to-drop-button"
        icon={<Icons.LinkNext color="neutral-3" />}
        hoverIndicator
        dropAlign={{ left: "right" }}
        dropContent={
          <List
            data={currentNetworkPeople.sort((a, b) =>
              a.name
                .toLocaleLowerCase()
                .localeCompare(b.name.toLocaleLowerCase()),
            )}
            primaryKey="name"
            action={(person: IPerson) => {
              return (
                <Button
                  icon={<Icons.CircleQuestion color="status-ok" />}
                  onClick={() => {
                    if (!currentPerson) return
                    const pathDetails = getPaths(currentPerson, person)
                    if (!pathDetails) return
                    showPaths(pathDetails)
                  }}
                />
              )
            }}
            style={{ height: "400px" }}
          />
        }
      />
    </Tip>
  )

  return (
    <Box direction="row">
      {props.isEditing ? (
        // Edit Mode
        !isViewingShared && (
          <React.Fragment>
            {viewModeButton}
            {ConnectPeopleDropButton}
            {ManageGroupsDropButton}
            {scalePersonButton}
            {toggleGroupNodeButton}
            {toggleBackgroundNodeButton}
            {deleteCurrentPersonButton}
          </React.Fragment>
        )
      ) : (
        // View Mode
        <React.Fragment>
          {!isViewingShared && editModeButton}
          {RelativeToButton}
        </React.Fragment>
      )}
    </Box>
  )
}

export default OverlayButtons
