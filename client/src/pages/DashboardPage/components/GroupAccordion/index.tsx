import {
  AccordionPanel,
  AccordionPanelProps,
  Box,
  Image,
  List,
  Pagination,
  Tab,
  Tabs,
  Text,
} from "grommet"
import * as Icons from "grommet-icons"
import React, { Dispatch, memo, useEffect, useRef, useState } from "react"
import { useDispatch } from "react-redux"
import SetNodeColorButton from "../../../../components/containers/SetNodeColorButton"
import SearchAndCheckMenu from "../../../../components/SearchAndCheckMenu"
import ToolTipButton from "../../../../components/ToolTipButton"
import {
  ICurrentNetwork,
  IPerson,
} from "../../../../store/networks/networkTypes"
import { zoomToPerson } from "../../../../store/ui/uiActions"
import useViewPerson from "../../logic/useViewPerson"
import useGroupAccordionFunctions from "./useGroupAccordionFunctions"
import useGroupVisibility, { IVisibilityLists } from "./useNodeVisibility"
import useToggleAllGroups from "./useToggleAllGroups"

export type RenderPersonItem = (
  person: IPerson,
  index: number,
) => React.ReactNode

interface IProps {
  currentNetwork: ICurrentNetwork
  // a group is a person whose .isGroup is true
  //  -- or an "all" literal indicating that all people should be rendered
  group: IPerson | "all"
  people: IPerson[]
  isViewingShared: boolean
  renderItem: RenderPersonItem
  search?: string
  panelProps?: AccordionPanelProps
}

/**
 * 1. Toggle node visibility
 * 2. Toggle group visibility
 * 3. Change group background and text colors
 * 4. Display tabs with nodes in 3 categories (All, Visible, Hidden)
 */
const GroupAccordion: React.FC<IProps> = ({
  currentNetwork,
  group,
  people,
  isViewingShared,
  renderItem,
  search,
  panelProps,
}) => {
  const dispatch: Dispatch<any> = useDispatch()
  const { viewPerson } = useViewPerson(currentNetwork)

  const { visibilityLists, showing, toggleAllNodeVisibility } =
    useGroupVisibility({
      group,
      people,
    })

  const { handleTogglePersonInGroup, toggleGroupVisibility } =
    useGroupAccordionFunctions({
      currentNetwork,
      group,
      doShowGroup: showing.group,
    })

  const { toggleAllGroupVisibility, isShowingAllGroups } = useToggleAllGroups({
    groups: group === "all" ? people.filter((p) => p.isGroup) : [],
  })

  const accordionRef = useRef<HTMLDivElement | null>(null)
  // Make the accordion header sticky
  // This is a hacky solution, but Grommet's AccordionPanel style prop doesn't style the right element to make the accordion sticky
  useEffect(() => {
    if (!accordionRef.current) return

    const actualAccordionLabel = accordionRef.current.querySelector(
      "[role='tab']",
    ) as HTMLButtonElement

    if (!actualAccordionLabel) return
    actualAccordionLabel.style.position = "sticky"
    actualAccordionLabel.style.top = "0px"
  }, [accordionRef])

  const doHideFromSearch = search !== "" && visibilityLists.all.length === 0
  if (doHideFromSearch) return null

  const groupAccordionStyles: React.CSSProperties = {
    height: "48px",
    width: "100%",
    backgroundColor: "#222",
    color: "#ddd",
    filter: !showing.group // Dim the group accordion if it's empty or if it's hiding its nodes
      ? "brightness(0.5)"
      : undefined,
    opacity: 1,
  } // groupAccordionStyles

  const GroupVisibilityToggle = (
    <Box margin={{ left: "auto" }} background="dark-1">
      <ToolTipButton
        onClick={(e) => {
          e.stopPropagation()
          if (group === "all") {
            toggleAllGroupVisibility()
            return
          }
          toggleGroupVisibility!()
        }}
        tooltip={
          group === "all"
            ? isShowingAllGroups
              ? "Click to hide all groups"
              : "Click to show all groups"
            : showing.group
            ? "Click to hide group"
            : "Click to show group"
        }
        icon={
          group === "all" ? (
            isShowingAllGroups ? (
              <Icons.Folder color="status-ok" />
            ) : (
              <Icons.Folder color="status-critical" />
            )
          ) : showing.group ? (
            <Icons.Folder color="status-ok" />
          ) : (
            <Icons.Folder color="status-critical" />
          )
        }
      />
    </Box>
  ) // GroupVisibilityToggle

  const NodesVisibilityToggle = (
    <Box margin={{ left: "auto" }} background="dark-1">
      <ToolTipButton
        tooltip={
          group === "all"
            ? showing.all
              ? "Click to hide all"
              : "Click to show all "
            : showing.all
            ? "Click to hide all in group"
            : "Click to show all in group"
        }
        onClick={(e) => {
          e.stopPropagation()
          toggleAllNodeVisibility()
        }}
        icon={
          showing.all ? (
            <Icons.FormView color="accent-1" />
          ) : (
            <Icons.FormViewHide color="accent-1" />
          )
        }
      />
    </Box>
  ) // NodesVisibilityToggle

  const personCountLabel =
    "[" +
    (visibilityLists.all.length > 0
      ? `${visibilityLists.visible.length}/${visibilityLists.all.length}`
      : "EMPTY") +
    "]"

  const GroupThumbnail = group !== "all" && (
    <Box
      onClick={(e) => {
        e.stopPropagation()
        viewPerson(group.id)()
      }} // Open the person overlay for the group when clicked
      onMouseEnter={() => {
        dispatch(zoomToPerson(group.id))
      }} // Set the "zoomed-in person" in global state. The force-graph will zoom in on this group's node
      onMouseLeave={() => dispatch(zoomToPerson(null))}
      align="center"
      justify="center"
      style={{
        margin: "0 1rem",
        backgroundColor: "#ddd",
        overflow: "hidden",
        width: 32,
        height: 32,
        borderRadius: 4,
      }}
    >
      {group.thumbnailUrl ? (
        <Image src={group.thumbnailUrl} fit="cover" />
      ) : (
        <Icons.Folder color="dark-1" />
      )}
    </Box>
  ) // GroupThumbnail

  const GroupAccordionLabel: React.ReactNode = (
    <Box
      direction="row"
      align="center"
      justify="start"
      fill
      aria-label="Select person"
      style={{
        backgroundColor: group !== "all" ? group.backgroundColor : "#ddd",
        color: group !== "all" ? group.textColor : "#222",
      }}
    >
      <Box direction="row" width="60%">
        {GroupThumbnail}
        <span
          style={{
            textOverflow: "ellipsis",
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}
        >
          {group === "all" ? (
            <Text margin={{ left: "1rem" }}>All</Text>
          ) : (
            group.name
          )}
        </span>
      </Box>
      {
        <Box direction="row" margin={{ left: "auto" }} align="center">
          <span style={{ marginRight: "1rem" }}>{personCountLabel}</span>
          {GroupVisibilityToggle}
          {NodesVisibilityToggle}
        </Box>
      }
    </Box>
  ) // GroupAccordionLabel

  const ManageGroupBox: React.ReactNode = group !== "all" && (
    <Box gap="xsmall">
      {/* Buttons */}
      <Box direction="row" justify="end">
        <SetNodeColorButton
          field="backgroundColor"
          networkId={currentNetwork.id}
          nodeId={group.id}
        />
        <SetNodeColorButton
          field="textColor"
          networkId={currentNetwork.id}
          nodeId={group.id}
        />
      </Box>
      <Box background="light-1" height="medium">
        <SearchAndCheckMenu
          defaultOptions={people.filter((p) => p.id !== group.id)} // CANNOT add a group to itself
          idField="id"
          nameField="name"
          isCheckedFunction={(arg: IPerson) =>
            group.relationships[arg.id] !== undefined
          }
          toggleOption={handleTogglePersonInGroup!}
          boxStyles={{ width: "100%" }}
        />
      </Box>
    </Box>
  ) // ManageGroupBox

  return (
    <AccordionPanel
      style={groupAccordionStyles}
      label={GroupAccordionLabel}
      ref={accordionRef}
      {...panelProps}
    >
      <Box pad="medium">
        <GroupTabs
          visibilityLists={visibilityLists}
          renderItem={renderItem}
          additionalTabs={
            group !== "all" &&
            !isViewingShared && <Tab title="Manage">{ManageGroupBox}</Tab>
          }
        />
      </Box>
    </AccordionPanel>
  )
}

export default GroupAccordion

interface IGroupTab<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  tabName: string
}

interface IGroupTabs {
  visibilityLists: IVisibilityLists
  renderItem: RenderPersonItem
  additionalTabs?: React.ReactNode
}
const GroupTabs = ({
  visibilityLists,
  renderItem,
  additionalTabs,
}: IGroupTabs) => {
  return (
    <Tabs>
      <GroupTab
        tabName="All"
        items={visibilityLists.all.sort(alphanumericSort)}
        renderItem={renderItem}
      />
      <GroupTab
        tabName="Visible"
        items={visibilityLists.visible.sort(alphanumericSort)}
        renderItem={renderItem}
      />
      <GroupTab
        tabName="Hidden"
        items={visibilityLists.hidden.sort(alphanumericSort)}
        renderItem={renderItem}
      />
      {additionalTabs}
    </Tabs>
  )
}

// MUST memoize this component
// -- otherwise, GroupTab keeps rendering.
// I have yet to find the useEffect or useState causing unecessary rerenders (if it exists).
const PAGINATION_STEP = 5
const GroupTab = memo(
  ({ items: people, renderItem, tabName }: IGroupTab<IPerson>) => {
    const isEmpty = people.length === 0
    const maxPage = Math.ceil(people.length / PAGINATION_STEP)

    const [page, setPage] = useState(1)
    const [peopleOnPage, setPeopleOnPage] = useState<IPerson[] | null>(null)

    const handlePageChange = (e: React.SyntheticEvent & { page: number }) => {
      setPage(e.page)
    }

    const updatePeopleOnPage = () => {
      let boundedPage = page
      if (page > maxPage) boundedPage = maxPage
      else if (page < 1) boundedPage = 1

      const range = calculatePageIndexes(boundedPage, PAGINATION_STEP)
      const peopleInRange = people.slice(range.start, range.end + 1)
      setPeopleOnPage(peopleInRange)
    }

    useEffect(updatePeopleOnPage, [people, page])

    return (
      <Tab title={`${tabName} (${people.length})`} disabled={isEmpty}>
        <Box direction="column" align="center">
          {!isEmpty && (
            <Pagination
              numberItems={people.length}
              page={page}
              step={PAGINATION_STEP}
              onChange={handlePageChange}
            />
          )}
          {!isEmpty && peopleOnPage && (
            <List
              data={peopleOnPage}
              children={renderItem}
              paginate={false}
              style={{ width: "100%" }}
            />
          )}
        </Box>
      </Tab>
    )
  },
)

/**
 * @param page
 * @param step
 * @returns start and end item indexes (inclusive) for a given page
 */
function calculatePageIndexes(page: number, step: number) {
  // e.g. page = 1, step = 5 is indexes 0 to 4 (inclusive)
  // Formula: ((page - 1) * step) to (page * step - 1)
  // ((1 - 1) * 5) to (1 * 5 - 1)
  const start = (page - 1) * step
  const end = page * step - 1
  return { start, end }
}

function alphanumericSort(a: IPerson, b: IPerson) {
  return a.name.toLowerCase().localeCompare(b.name.toLowerCase())
}
