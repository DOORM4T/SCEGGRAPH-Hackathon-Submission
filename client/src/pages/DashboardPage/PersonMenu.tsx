import {
  Accordion,
  AccordionPanel,
  Box,
  Button,
  Heading,
  Image,
  List,
  Tab,
  Tabs,
  Text,
  TextInput,
} from "grommet"
import * as Icons from "grommet-icons"
import React from "react"
import { useDispatch, useSelector } from "react-redux"
import { Dispatch } from "redux"
import SearchAndCheckMenu from "../../components/SearchAndCheckMenu"
import { addPerson } from "../../store/networks/actions"
import { togglePersonInGroup } from "../../store/networks/actions/togglePersonInGroup"
import { IPerson } from "../../store/networks/networkTypes"
import { getCurrentNetwork } from "../../store/selectors/networks/getCurrentNetwork"
import {
  setPersonInFocus,
  togglePersonEditMenu,
  zoomToPerson,
} from "../../store/ui/uiActions"

interface IProps {
  id: string
  data: IPerson[]
  selected: {
    [key: string]: boolean
  }
  setSelected: React.Dispatch<
    React.SetStateAction<{
      [key: string]: boolean
    }>
  >
}

const NAME_CHAR_LIMIT = 30
const PersonMenu: React.FC<IProps> = (props) => {
  // -== STATE ==- //

  const dispatch: Dispatch<any> = useDispatch()
  const currentNetwork = useSelector(getCurrentNetwork)

  // List of people to display in the list
  const [personListData, setPersonListData] = React.useState(props.data)

  // Add/Search input
  const [topInput, setTopInput] = React.useState("")

  // State to navigate through the found persons list
  const [foundIndex, setFoundIndex] = React.useState(0)

  // List ref for managing the list DOM  (e.g. to focus on an item)
  const listRef = React.useRef<HTMLUListElement>()

  // Update the person list whenever it changes or when the topInput search changes
  React.useEffect(() => {
    // Filter the person list
    const search = topInput.toLowerCase().trim()
    const filtered = props.data.filter((person) =>
      person.name.toLowerCase().includes(search),
    )
    setPersonListData(filtered)
    setFoundIndex(-1)
  }, [props.data, topInput])

  // Focus on the person at a corresponding foundIndex
  React.useEffect(() => {
    // Stop if there's no list ref
    if (!listRef.current) return

    // Ensure the foundIndex exists
    if (foundIndex >= 0 && foundIndex < personListData.length) {
      // Scroll the person node into view
      listRef.current.children[foundIndex].scrollIntoView({
        behavior: "smooth",
      })

      // Zoom in on the selected person in the force-graph
      dispatch(zoomToPerson(personListData[foundIndex].id))
    }
  }, [foundIndex])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTopInput(e.currentTarget.value)
  }

  // Add a person to the network
  const handleAddPerson = async () => {
    // Stop if the current network doesn't exist or if the user didn't type anything in the top input
    if (!currentNetwork || topInput === "") return

    try {
      await dispatch(addPerson(currentNetwork.id, topInput)) // Add the person in global state
    } catch (error) {
      console.error(error)
    }
  }

  /* Open a Person's content menu */
  const viewPerson = (id: string) => async () => {
    if (!currentNetwork) return
    const person = currentNetwork.people.find((p) => p.id === id)
    if (!person) return

    /* focus on the person */
    try {
      await dispatch(setPersonInFocus(person.id))
      /* open edit menu */
      dispatch(togglePersonEditMenu(true))
    } catch (error) {
      console.error(error)
    }
  }

  /* Add/remove a person from list of selected people 
      This list is for performing batch operations on multiple people */
  const toggleSelected = (id: string) => () => {
    const newSelected = { ...props.selected }
    if (props.selected[id]) {
      newSelected[id] = false
    } else {
      newSelected[id] = true
    }
    props.setSelected(newSelected)
  }

  // Function to un-zoom on a person
  const resetZoomedPerson = () => dispatch(zoomToPerson(null))

  /**
   * How the lists render items
   * @param canSearch whether the search item can be highlighted or not (this will only be enabled for the "ALL" list)
   */
  const renderItem = (canSearch: boolean) => (item: IPerson, index: number) => {
    // TODO: Batch select -- const isSelected = props.selected[item.id]
    const isSelected = canSearch && foundIndex === index

    return (
      <Box
        key={`${item.id}-${index}`}
        direction="row"
        align="center"
        justify="start"
        gap="small"
      >
        <Box
          onClick={viewPerson(item.id)} // Open the person overlay when clicked
          // onClick={toggleSelected(item.id)} // TODO: Implement batch operations
          onMouseEnter={() => {
            dispatch(zoomToPerson(item.id))
            setFoundIndex(-1) // Clear the foundPerson highlight
          }} // Set the "zoomed-in person" in global state. The force-graph will zoom in on that person.
          onMouseLeave={resetZoomedPerson}
          aria-label="Select person"
          width="64px"
          height="64px"
          align="start"
          justify="center"
          style={{
            cursor: "pointer",
            filter: isSelected ? "brightness(200%)" : undefined,
          }}
        >
          <Box background="brand" fill align="center" justify="center">
            {item.thumbnailUrl ? (
              <Image src={item.thumbnailUrl} height="64px" width="64px" />
            ) : (
              <Icons.User width="100%" />
            )}
          </Box>
        </Box>
        <Box>
          <Text
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "20ch",
            }}
          >
            {item.name.length > NAME_CHAR_LIMIT
              ? `${item.name.slice(0, NAME_CHAR_LIMIT)}...`
              : item.name}
          </Text>
        </Box>
      </Box>
    )
  }

  const handleShortkeys = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (e.ctrlKey) {
        // Add the person in the search box if CTRL+ENTER
        await handleAddPerson()
      } else if (e.shiftKey) {
        // Select previous if SHIFT+ENTER
        let prevIndex = foundIndex - 1
        if (prevIndex < 0) prevIndex = personListData.length - 1
        setFoundIndex(prevIndex)
      } else {
        // Select next if ENTER
        setFoundIndex((foundIndex + 1) % personListData.length)
      }
    } else if (e.key === "Escape") {
      e.currentTarget.blur()
    }
  }

  return (
    <React.Fragment>
      {/* Top input for searching/adding people */}
      <Box direction="row" align="center" pad="small" gap="none">
        <TextInput
          width="75%"
          placeholder="Search for (ENTER, SHIFT+ENTER) or add a person (CTRL+ENTER)"
          onChange={handleInputChange}
          onClick={(e) => e.currentTarget.select()}
          onBlur={() => setFoundIndex(-1)}
          value={topInput}
          onKeyUp={handleShortkeys}
          style={{ fontSize: "12px" }}
        />
        <Box direction="row" width="25%" justify="center">
          <Button
            onClick={handleAddPerson}
            type="submit"
            icon={<Icons.Add />}
            aria-label="Add person (Click or CTRL+ENTER)"
            hoverIndicator
          />
        </Box>
      </Box>

      {/* -== PERSON LISTS ==- */}
      {currentNetwork && (
        <Box fill style={{ overflowY: "auto" }}>
          {personListData.length > 0 ? (
            <Accordion animate={false} multiple={true}>
              {/* Group for ALL people in the network */}
              <AccordionPanel
                key="group-all"
                style={{
                  height: "48px",
                  backgroundColor: "#AAA",
                  color: "#222",
                }}
                label={
                  <React.Fragment>
                    <span style={{ marginLeft: "1rem" }}>All</span>
                    <span style={{ marginLeft: "auto" }}>
                      [{personListData.length}]
                    </span>
                  </React.Fragment>
                }
              >
                <List
                  id={props.id}
                  data={personListData}
                  children={renderItem(true)}
                  ref={(el: any) => (listRef.current = el)}
                />
              </AccordionPanel>

              {/* Render user-created groups */}
              {/* TODO: Render group lists */}
              {currentNetwork.relationshipGroups &&
                Object.entries(currentNetwork.relationshipGroups)
                  // Sort each group by name in alphanumeric order
                  .sort((e1, e2) =>
                    e1[1].name
                      .toLowerCase()
                      .localeCompare(e2[1].name.toLowerCase()),
                  )

                  .map((entry, index) => {
                    const [groupId, group] = entry
                    const peopleInGroup = personListData.filter((person) =>
                      group.personIds.includes(person.id),
                    )
                    const isEmpty = peopleInGroup.length === 0

                    // Function to toggle this person in group
                    const createTogglePersonInGroupFunc = (
                      personId: string,
                      isInGroup: boolean,
                    ) => async () => {
                      const doAdd = !isInGroup

                      try {
                        await dispatch(
                          togglePersonInGroup(
                            currentNetwork.id,
                            groupId,
                            personId,
                            doAdd,
                          ),
                        )
                      } catch (error) {
                        console.error(error)
                      }
                    }

                    return (
                      <AccordionPanel
                        key={`group-${group.name}-${index}`}
                        style={{
                          height: "48px",
                          backgroundColor: group.backgroundColor,
                          color: group.textColor,
                          filter: isEmpty
                            ? "brightness(50%) saturate(50%)"
                            : undefined,
                        }}
                        label={
                          <React.Fragment>
                            <span style={{ marginLeft: "1rem" }}>
                              {group.name}
                            </span>
                            <span style={{ marginLeft: "auto" }}>
                              [{peopleInGroup.length}]
                            </span>
                          </React.Fragment>
                        }
                      >
                        <Box pad="medium">
                          <Tabs>
                            <Tab title="View">
                              <List
                                data={peopleInGroup}
                                children={renderItem(false)}
                              />
                            </Tab>
                            <Tab title="Manage">
                              <Box background="light-1">
                                <SearchAndCheckMenu
                                  defaultOptions={personListData}
                                  idField="id"
                                  nameField="name"
                                  isCheckedFunction={(arg: IPerson) =>
                                    group.personIds.includes(arg.id)
                                  }
                                  toggleOption={createTogglePersonInGroupFunc}
                                />
                              </Box>
                            </Tab>
                          </Tabs>
                        </Box>
                      </AccordionPanel>
                    )
                  })}
            </Accordion>
          ) : (
            <Text textAlign="center">
              {topInput.length > 0 ? "No results" : "Nothing here... yet!"}
            </Text>
          )}
        </Box>
      )}
    </React.Fragment>
  )
}

export default PersonMenu