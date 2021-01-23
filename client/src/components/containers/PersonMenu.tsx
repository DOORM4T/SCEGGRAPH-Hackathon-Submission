import { Box, Image, Text } from "grommet"
import * as Icons from "grommet-icons"
import React from "react"
import { useDispatch, useSelector } from "react-redux"
import { Dispatch } from "redux"
import {
  deletePerson as deletePersonById,
  getAllPeople,
} from "../../store/networks/networksActions"
import {
  ICurrentNetwork,
  INetwork,
  IPerson,
} from "../../store/networks/networkTypes"
import { IApplicationState } from "../../store/store"
import {
  setPersonInFocus,
  togglePersonEditMenu,
} from "../../store/ui/uiActions"
import ActionList from "../ActionList"
import EditPersonSidebar from "./EditPersonSidebar"

/**
 * Container Menu for viewing, editing, and deleting individuals from a list of people
 * Uses Redux actions & updates the app's database
 */
// TODO: replace action icon menu with a single button that opens the Person sidebar
const PersonMenu: React.FC<IProps> = (props) => {
  // -== STATE ==- //
  const dispatch: Dispatch<any> = useDispatch()
  const isEditMenuOpen = useSelector<IApplicationState, boolean>(
    (state) => state.ui.isPersonEditMenuOpen,
  )
  const currentNetwork = useSelector<IApplicationState, ICurrentNetwork | null>(
    (state) => state.networks.currentNetwork,
  )

  // -== MENU ACTIONS ==- //
  const viewPerson = (id: string) => () => {
    // TODO: view details
    console.log(`View [${id}]`)
  }

  const editPerson = (id: string) => async () => {
    if (!currentNetwork) return

    console.log(`Edit [${id}]`)
    const person = currentNetwork.people.find((p) => p.id === id)
    if (!person) return

    /* focus on the person */
    await dispatch(setPersonInFocus(person))

    /* open edit menu */
    await dispatch(togglePersonEditMenu(true))
  }

  const deletePerson = (id: string) => async () => {
    if (!currentNetwork) return
    try {
      await dispatch(deletePersonById(currentNetwork.id, id))
      await dispatch(getAllPeople(currentNetwork.id))
    } catch (error) {
      console.error(error)
    }
  }

  /* How the list renders the item */
  const renderItem = (item: IPerson, index: number) => {
    return (
      <Box dir="column" align="start">
        <Box onClick={() => console.log(item)}>
          {item.thumbnailUrl ? (
            <Image src={item.thumbnailUrl} />
          ) : (
            <Icons.User />
          )}
        </Box>
        <Text>{item.name}</Text>
      </Box>
    )
  }

  return (
    <React.Fragment>
      <ActionList
        data={props.data}
        renderItem={renderItem}
        handleView={viewPerson}
        handleEdit={editPerson}
        handleDelete={deletePerson}
      />
      {isEditMenuOpen && <EditPersonSidebar />}
    </React.Fragment>
  )
}

export default PersonMenu

interface IProps {
  data: IPerson[]
}
