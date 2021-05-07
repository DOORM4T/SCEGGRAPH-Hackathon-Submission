import { Box, Menu, Select, Tip } from "grommet"
import * as Icons from "grommet-icons"
import React from "react"
import { useDispatch, useSelector } from "react-redux"
import { ActionCreator, AnyAction } from "redux"
import { HEADER_HEIGHT } from "../../../components/containers/AppHeader"
import ToolTipButton from "../../../components/ToolTipButton"
import { getCurrentNetworkJSON } from "../../../helpers/getNetworkJSON"
import { importJSONAsNetwork } from "../../../helpers/importJSONAsNetwork"
import useAuth from "../../../hooks/auth/useAuth"
import useSmallBreakpoint from "../../../hooks/useSmallBreakpoint"
import {
  addPerson,
  createGroup,
  createNetwork,
  deleteNetwork,
  renameNetwork,
  setNetwork,
  setNetworkLoading,
} from "../../../store/networks/actions"
import { getCurrentNetwork } from "../../../store/selectors/networks/getCurrentNetwork"
import { getIsViewingShared } from "../../../store/selectors/ui/getIsViewingShared"
import { toggleShareOverlay } from "../../../store/ui/uiActions"
import { IMenuHeaderProps } from "../MenuHeader"

interface INetworkSelectOption {
  id: string
  name: string
}

export default function useMenuHeader({
  currentNetwork,
  networks,
  isZeroLoginMode,
  doShowPersonMenu,
  setShowPersonMenu,
}: IMenuHeaderProps) {
  const isSmall = useSmallBreakpoint()
  const dispatch: ActionCreator<AnyAction> = useDispatch()
  const selectedNetwork = useSelector(getCurrentNetwork)
  const { isAuthenticated } = useAuth()

  // REDUX SELECTOR | Viewing a shared network?
  const isViewingShared = useSelector(getIsViewingShared)

  const defaultNetworkOptions = networks.map((n) => ({
    id: n.id,
    name: n.name,
  }))

  const [isSearching, setSearching] = React.useState<boolean>(false)
  const [networkOptions, setNetworkOptions] = React.useState<
    INetworkSelectOption[]
  >(defaultNetworkOptions)

  /* Logic for opening the network select menu when CTRL + / is pressed */
  const selectNetworkRef = React.useRef<any>(null)
  React.useEffect(() => {
    const openNetworkSelect = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        e.ctrlKey &&
        !isSearching &&
        selectNetworkRef.current
      ) {
        ;(selectNetworkRef.current as HTMLElement).click()
      }
    }

    window.addEventListener("keyup", openNetworkSelect)

    /* Remove listener on component unmount */
    return () => {
      window.removeEventListener("keyup", openNetworkSelect)
    }
  }, [])

  //                                 //
  // -== ACTION BUTTON FUNCTIONS ==- //
  //                                 //

  /* Add Person Function */
  const handleAddPerson = async () => {
    if (!currentNetwork) {
      alert("Please select a Network!")
      return
    }

    /* get name of person to add */
    const name = window.prompt("Name of person:")
    if (!name) {
      alert("Canceled add person action")
      return
    }

    /* Update state */
    try {
      await dispatch(addPerson(currentNetwork.id, name))
    } catch (error) {
      console.error(error)
    }
  }

  /* Delete Network Function */
  const handleDeleteNetwork = async () => {
    if (!currentNetwork) return

    /* Confirm deletion */
    const doDelete = window.confirm(`Delete network: ${currentNetwork.name}?`)
    if (!doDelete) {
      alert(`Did not delete ${currentNetwork.name}`)
      return
    }

    /* Update state */
    try {
      await dispatch(deleteNetwork(currentNetwork.id))
    } catch (error) {
      console.error(error)
    }
  }

  /* Export Network to JSON Function */
  const handleExportToJSON = async () => {
    /* Stop if no network is selected */
    if (!currentNetwork) return

    try {
      /* Set loading */
      await dispatch(setNetworkLoading(true))

      /* Get the current network as JSON */
      const networkJSON = await getCurrentNetworkJSON()

      /* Stop if no data was found */
      if (!networkJSON) return

      /* Convert the JSON to an Object URL */
      const stringJSON = JSON.stringify(networkJSON)
      const encoded = Buffer.from(stringJSON)
      const blob = new Blob([encoded], { type: "application/json" })
      const objectURL = URL.createObjectURL(blob)

      /* Download the JSON via Object URL */
      const downloadElement = document.createElement("a")
      const networkNameWithoutSpaces = currentNetwork.name.replace(/\s/g, "")
      downloadElement.download = `${networkNameWithoutSpaces}_export.json`
      downloadElement.href = objectURL
      downloadElement.click()
    } catch (error) {
      /* Failed to get the network JSON */
      console.error(error)
    } finally {
      /* Disable network loading */
      await dispatch(setNetworkLoading(false))
    }
  }

  const handleRenameNetwork = async () => {
    /* Stop if no network is selected */
    if (!currentNetwork) return

    /* Prompt the user for the new name */
    const newName = window.prompt(`Rename ${currentNetwork.name} to: `)
    if (!newName) {
      alert("Canceled rename action.")
      return
    }

    // Dispatch to global state
    try {
      await dispatch(renameNetwork(currentNetwork.id, newName))
    } catch (error) {
      console.error(error)
    }
  }

  /* Select Network Function */
  const handleNetworkSelect = async (
    event: Event & { value: INetworkSelectOption },
  ) => {
    try {
      if (!event.value) throw new Error("Network not found.")

      await dispatch(setNetwork(event.value.id))
      setSearching(false)
    } catch (error) {
      console.error(error)
    }
  }

  /* Create Network Function */
  const handleCreateNetwork = async () => {
    /* If in Zero-login mode, this will delete the current network. Ask the user to confirm before creating a new network.
      (the old network will appear under the global 'networks' state, but will be unusable because person data will not be saved) */
    if (currentNetwork && isZeroLoginMode) {
      const doContinue = window.confirm(
        "Create a new network?\n\nYour current network will NOT be saved -- be sure to export it first if you wish to save your work!\n\nPress OK to delete the current network and create a new one.",
      )

      // Stop if the user cancels
      if (!doContinue) return
    }

    const networkName = window.prompt("Name your network:")
    if (!networkName) {
      alert("Canceled network creation")
      return
    }

    try {
      await dispatch(createNetwork(networkName))
      setShowPersonMenu(true) // Open the person menu when the new network is created
    } catch (error) {
      console.error(error)
    }
  }

  /* Import Network from JSON Function */
  const handleImportFromJSON = async () => {
    const fileInput = document.createElement("input")
    fileInput.type = "file"
    fileInput.multiple = true
    fileInput.accept = ".json"
    fileInput.click()

    // Wait for the user to upload JSON files
    fileInput.onchange = () => importJSONAsNetwork(fileInput.files)
  }

  const handleCreateGroup = async () => {
    if (!currentNetwork) {
      alert("Please select a Network!")
      return
    }

    /* get name of person to add */
    const groupName = window.prompt("Name of group:")
    if (!groupName) {
      alert("Canceled create group action")
      return
    }

    try {
      await dispatch(createGroup(currentNetwork.id, groupName))
    } catch (error) {
      console.error(error)
    }
  }

  // FUNCTION | Open the sharing overlay menu
  const openSharingMenu = async () => {
    if (!currentNetwork) return

    try {
      await dispatch(toggleShareOverlay(true))
    } catch (error) {
      console.error(error)
    }
  }

  const actionButtons = [
    <ToolTipButton
      key="add-person-button"
      id="add-person-button"
      tooltip="Add person"
      ariaLabel="Add a person to the network"
      icon={<Icons.UserAdd color="light-1" />}
      onClick={handleAddPerson}
      isDisabled={!currentNetwork}
    />,

    <ToolTipButton
      key="create-group-button"
      id="create-group-button"
      tooltip="Create relationship group"
      ariaLabel="Create a relationship group"
      icon={<Icons.Folder color="light-1" />}
      onClick={handleCreateGroup}
      isDisabled={!currentNetwork}
    />,

    <ToolTipButton
      key="export-network-json-button"
      id="export-network-json-button"
      tooltip="Export network to JSON"
      ariaLabel="Export the network as a JSON file"
      icon={<Icons.Download color="light-1" />}
      onClick={handleExportToJSON}
      isDisabled={!currentNetwork}
    />,

    <ToolTipButton
      key="rename-network-button"
      id="rename-network-button"
      tooltip="Rename network"
      ariaLabel="Rename this network"
      icon={<Icons.Tag color="light-1" />}
      onClick={handleRenameNetwork}
      isDisabled={!currentNetwork}
    />,

    // Share Button -- Shows only if the user is authenticated
    isAuthenticated ? (
      <ToolTipButton
        key="share-network-button"
        id="share-network-button"
        tooltip="Share network"
        ariaLabel="Share this network"
        icon={<Icons.ShareOption color="accent-1" />}
        onClick={openSharingMenu}
        isDisabled={!currentNetwork}
      />
    ) : null,

    <ToolTipButton
      key="delete-network-button"
      id="delete-network-button"
      tooltip="Delete network"
      ariaLabel="Delete this network"
      icon={<Icons.Threats color="status-critical" />}
      onClick={handleDeleteNetwork}
      isDisabled={!currentNetwork}
    />,
  ]

  /* Handle searches for network options */
  const handleOptionSearch = (text: string) => {
    if (!text) {
      /* Searching for nothing? Done searching. */
      setSearching(false)
      return
    }

    /* Filter default options using the search */
    setSearching(true)
    const filtered = defaultNetworkOptions.filter((n) =>
      n.name.match(new RegExp(text, "i")),
    )
    setNetworkOptions(filtered)
  }

  /* How the select menu renders options */
  const renderNetworkOptions = (
    option: INetworkSelectOption,
    index: number,
  ) => {
    return (
      <Box
        key={`${option.id}-${index}`}
        pad="small"
        width="large"
        // style={{ overflow: "hidden", textOverflow: "ellipsis" }}
      >
        {option.name}
      </Box>
    )
  }

  /* Menu for selecting a network */
  const networkSelectMenu: React.ReactNode = (
    <Select
      dropHeight="350px"
      id="select-network-dropbutton"
      aria-label="Select a network"
      placeholder={
        networks.length === 0
          ? `No networks found`
          : `Select a network (CTRL + /)`
      }
      searchPlaceholder="Search by name"
      options={isSearching ? networkOptions : defaultNetworkOptions}
      onChange={handleNetworkSelect}
      dropAlign={{ top: "bottom" }}
      disabled={networks.length === 0}
      valueLabel={
        selectedNetwork ? (
          <Box
            align="start"
            justify="center"
            pad="small"
            style={{
              maxWidth: "30ch",
              maxHeight: `${HEADER_HEIGHT}px`,
              padding: "4px 8px",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {selectedNetwork.name}
          </Box>
        ) : null
      }
      value={selectedNetwork?.name}
      onSearch={handleOptionSearch}
      ref={selectNetworkRef}
    >
      {renderNetworkOptions}
    </Select>
  )

  const leftHeaderItems: React.ReactNode = (
    <Box direction="row" gap="small" overflow="hidden">
      {/* Toggle Person Menu button -- shows for any dashboard mode */}
      {currentNetwork && ( // Shows only if there's a current network
        <ToolTipButton
          id="toggle-person-menu"
          tooltip={doShowPersonMenu ? "Collapse menu" : "Expand menu"}
          icon={
            doShowPersonMenu ? (
              <Icons.CaretDown color="status-ok" />
            ) : (
              <Icons.CaretNext color="status-critical" />
            )
          }
          onClick={() => setShowPersonMenu((doShow) => !doShow)}
          buttonStyle={{
            backgroundColor: "#444",
            margin: 0,
          }}
        />
      )}

      {/* Hide these options if in shared mode */}
      {!isViewingShared && (
        <React.Fragment>
          <ToolTipButton
            id="create-network-button"
            tooltip="Create a new network"
            ariaLabel="Create a new network"
            icon={<Icons.Add color="status-ok" />}
            onClick={handleCreateNetwork}
            buttonStyle={{
              border: "2px solid white",
              borderRadius: "2px",
            }}
          />
          <ToolTipButton
            key="import-network-json-button"
            id="import-network-json-button"
            tooltip="Import network from JSON"
            ariaLabel="Import a network from a JSON file"
            icon={<Icons.Upload color="light-1" />}
            onClick={handleImportFromJSON}
          />
        </React.Fragment>
      )}
      {/* 
          Render the select menu IFF a user is authenticated
            Unauthenticated users can only have ONE network active at a time, since multiple networks + people would have to be stored locally, 
              which can be messy and reduce performance 
              -- they should rely on import/export, since their networks are not saved on the backend.

          Show just the network name if in zero-login mode or shared mode
        */}
      {isZeroLoginMode || isViewingShared ? (
        // Show just the current network name in zero-login mode
        currentNetwork ? (
          <Tip
            content={currentNetwork.name}
            dropProps={{ align: { left: "right" } }}
          >
            <h2 style={{ height: "0.5rem", lineHeight: "0.5rem" }}>
              {currentNetwork.name.length > 16
                ? `${currentNetwork.name.slice(0, 16)}...`
                : currentNetwork.name}
            </h2>
          </Tip>
        ) : null
      ) : (
        // Show the network select menu if the user is logged in
        networkSelectMenu
      )}
    </Box>
  )

  const rightHeaderItems: React.ReactNode = (
    <Box direction="row" margin={{ left: "auto" }}>
      {isSmall ? (
        <Menu
          icon={
            <ToolTipButton
              id="actions-menu"
              tooltip="Toggle network actions menu"
              icon={<Icons.Actions />}
            />
          }
          items={actionButtons.map((btn) => ({ label: btn }))}
        />
      ) : (
        actionButtons.map((btn) => btn)
      )}
    </Box>
  )

  return {
    currentNetwork,
    isViewingShared,
    isZeroLoginMode,
    leftHeaderItems,
    rightHeaderItems,
  }
}
