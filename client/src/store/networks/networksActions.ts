import { ActionCreator, AnyAction, Dispatch } from "redux"
import { ThunkAction } from "redux-thunk"
import { v4 as uuidv4 } from "uuid"
import {
  auth,
  IFirebaseUser,
  networksCollection,
  peopleCollection,
  usersCollection,
} from "../../firebase"
import {
  IAddPersonAction,
  IConnectPeopleAction,
  ICreateNetworkAction,
  ICurrentNetwork,
  IDeleteNetworkByIdAction,
  IDeletePersonByIdAction,
  IGetAllNetworksIdsAction,
  IGetAllPeopleAction,
  INetwork,
  INetworkLoadingAction,
  INetworksState,
  IPerson,
  IRelationships,
  IResetClientNetworksAction,
  ISetNetworkAction,
  NetworkActionTypes,
} from "./networkTypes"

// -== ACTION CREATORS ==- //
/* set isLoading state to true for async actions. Reducer will set isLoading to false for async actions.. */
export const setNetworkLoading: ActionCreator<INetworkLoadingAction> = (
  isLoading: boolean,
) => ({
  type: NetworkActionTypes.LOADING,
  isLoading,
})

/**
 * Add a new Person to an existing Network
 * @param networkId ID of the network to add the person to
 * @param name new person's name
 */
export const addPerson: ActionCreator<
  ThunkAction<Promise<AnyAction>, INetworksState, null, IAddPersonAction>
> = (networkId: string, name: string) => {
  return async (dispatch: Dispatch) => {
    dispatch(setNetworkLoading(true))

    /* Initialize the new Person's document */
    const newPerson: IPerson = {
      id: uuidv4(),
      name,
      relationships: {},
    }

    try {
      /* Database updates */
      /* Create a document for the new Person */
      await peopleCollection.doc(newPerson.id).set(newPerson)

      /* Get the network document that will add this new Person */
      const networkDoc = networksCollection.doc(networkId)

      /* Update just the personIds field of the Network document */
      const networkData: INetwork = (await networkDoc.get()).data() as INetwork
      const updatedPersonIds = networkData.personIds.concat(newPerson.id)
      await networkDoc.update({ personIds: updatedPersonIds })

      return dispatch({
        type: NetworkActionTypes.ADD_PERSON,
        personId: newPerson.id,
      })
    } catch (error) {
      /* Failed to add the new Person */
      dispatch(setNetworkLoading(false))
      throw error
    }
  }
}

/**
 * Connect two People in some network
 * @param networkId
 * @param relationship
 */
export const connectPeople: ActionCreator<
  ThunkAction<Promise<AnyAction>, INetworksState, null, IConnectPeopleAction>
> = (
  networkId: string,
  relationship: {
    p1Id: string
    p2Id: string
    p1Reason: string
    p2Reason: string
  },
) => {
  return async (dispatch: Dispatch) => {
    dispatch(setNetworkLoading(true))

    const {
      p1Id,
      p2Id,
      p1Reason: p1Rel = "",
      p2Reason: p2Rel = "",
    } = relationship

    try {
      /* Database updates */
      /* Ensure each person exists in the network */
      const network = (
        await networksCollection.doc(networkId).get()
      ).data() as INetwork
      const hasP1 = network.personIds.some((id) => id === p1Id)
      const hasP2 = network.personIds.some((id) => id === p2Id)
      if (!hasP1 || !hasP2)
        throw new Error("One or both persons do not exist in that network.")

      /* Get the Firestore documents for each Person */
      const p1Doc = await peopleCollection.doc(p1Id)
      const p2Doc = await peopleCollection.doc(p2Id)

      /* Get the document data for each person */
      const p1Data: IPerson = (await p1Doc.get()).data() as IPerson
      const p2Data: IPerson = (await p2Doc.get()).data() as IPerson

      /* Copy existing relationships and add the new relationship for each person */
      const updatedP1Rels: IRelationships = {
        ...p1Data.relationships,
        [p2Id]: [p1Rel, p2Rel],
      }
      const updatedP2Rels: IRelationships = {
        ...p2Data.relationships,
        [p1Id]: [p2Rel, p1Rel],
      }

      /* Update just the "relationships" field in each Person document */
      await p1Doc.update({ relationships: updatedP1Rels })
      await p2Doc.update({ relationships: updatedP2Rels })

      return dispatch({
        type: NetworkActionTypes.CONNECT_PEOPLE,
      })
    } catch (error) {
      /* Failed to connect */
      dispatch(setNetworkLoading(false))
      throw error
    }
  }
}

/**
 * Create a new network
 * @param name
 */
export const createNetwork: ActionCreator<
  ThunkAction<Promise<AnyAction>, INetworksState, null, ICreateNetworkAction>
> = (name: string) => {
  return async (dispatch: Dispatch) => {
    dispatch(setNetworkLoading(true))

    /* Initialize the Network */
    const newNetwork: INetwork = {
      id: uuidv4(),
      name,
      personIds: [],
    }

    try {
      /* Database updates */
      /* Get the authenticated User's ID */
      const uid = auth.currentUser?.uid
      if (!uid) throw new Error("There is no currently authenticated user.")

      /* Add the Network's ID to the User's list of Network IDs */
      const userDoc = usersCollection.doc(uid)
      const userData = (await userDoc.get()).data() as IFirebaseUser
      const updatedUserNetworkIds = userData.networkIds.concat(newNetwork.id)
      userDoc.update({ networkIds: updatedUserNetworkIds })

      /* Create a document for the Network in the Networks collection */
      await networksCollection.doc(newNetwork.id).set(newNetwork)

      return dispatch({
        type: NetworkActionTypes.CREATE,
        newNetwork,
      })
    } catch (error) {
      /* Failed to create the Network */
      dispatch(setNetworkLoading(false))
      throw error
    }
  }
}

/**
 * Select a network by its ID, setting the "currentNetwork" field in global state
 * @param networkId
 */

/**
 * Gets all People in a Network
 * @param networkId
 */
export const getAllPeople: ActionCreator<
  ThunkAction<Promise<AnyAction>, INetworksState, null, IGetAllPeopleAction>
> = (networkId: string) => {
  return async (dispatch: Dispatch) => {
    dispatch(setNetworkLoading(true))

    try {
      /* Get the Network by its ID from the Networks collection */
      const networkData: INetwork = (
        await networksCollection.doc(networkId).get()
      ).data() as INetwork

      if (!networkData) throw new Error("Network not found.")

      /* Get all Person documents related to the Person IDs in the Network */
      const peopleData: IPerson[] = await Promise.all(
        networkData.personIds.map(
          async (id) =>
            (await peopleCollection.doc(id).get()).data() as IPerson,
        ),
      )

      return dispatch({
        type: NetworkActionTypes.GET_ALL_PEOPLE,
        people: peopleData,
      })
    } catch (error) {
      /* Failed to get the network */
      dispatch(setNetworkLoading(false))
      throw error
    }
  }
}

/**
 * Select a network by its ID, setting the "currentNetwork" field in global state
 * @param networkId
 */
export const setNetwork: ActionCreator<
  ThunkAction<Promise<AnyAction>, INetworksState, null, ISetNetworkAction>
> = (networkId: string) => {
  return async (dispatch: Dispatch) => {
    dispatch(setNetworkLoading(true))

    try {
      /* Database updates */
      /* Get the Network by its ID from the Networks collection */
      const networkData: INetwork = (
        await networksCollection.doc(networkId).get()
      ).data() as INetwork

      if (!networkData) throw new Error("Network not found.")

      /* Get all Person documents related to the Person IDs in the Network */
      const peopleData: IPerson[] = await Promise.all(
        networkData.personIds.map(
          async (id) =>
            (await peopleCollection.doc(id).get()).data() as IPerson,
        ),
      )

      /* Create a current network object from Network and People state  */
      const currentNetwork: ICurrentNetwork = {
        ...networkData,
        people: peopleData,
      }

      return dispatch({
        type: NetworkActionTypes.SET,
        currentNetwork,
      })
    } catch (error) {
      /* Failed to get the network */
      dispatch(setNetworkLoading(false))
      throw error
    }
  }
}

/**
 * Delete a Network by its ID
 * @param networkId
 */
export const deleteNetwork: ActionCreator<
  ThunkAction<
    Promise<AnyAction>,
    INetworksState,
    null,
    IDeleteNetworkByIdAction
  >
> = (networkId: string) => {
  return async (dispatch: Dispatch) => {
    dispatch(setNetworkLoading(true))

    try {
      /* Database updates */
      await networksCollection.doc(networkId).delete()

      return dispatch({
        type: NetworkActionTypes.DELETE,
        networkId,
      })
    } catch (error) {
      /* Failed to delete the Network */
      dispatch(setNetworkLoading(false))
      throw error
    }
  }
}

/**
 * Delete a Person from a Network by ID
 * @param networkId
 * @param personId
 */
export const deletePerson: ActionCreator<
  ThunkAction<Promise<AnyAction>, INetworksState, null, IDeletePersonByIdAction>
> = (networkId: string, personId: string) => {
  return async (dispatch: Dispatch) => {
    dispatch(setNetworkLoading(true))

    try {
      /* Remove the Person from the Network */
      const networkDoc = networksCollection.doc(networkId)
      const networkData = (await networkDoc.get()).data() as INetwork
      const peopleWithoutDeletedPerson = networkData.personIds.filter(
        (id) => id !== personId,
      )

      /* Update the Network's personIds field with the new list of person IDs */
      await networkDoc.update({ personIds: peopleWithoutDeletedPerson })

      /* Delete the Person's document*/
      await peopleCollection.doc(personId).delete()

      return dispatch({
        type: NetworkActionTypes.DELETE_PERSON,
        networkId,
        personId,
      })
    } catch (error) {
      /* Failed to delete the Person */
      dispatch(setNetworkLoading(false))
      throw error
    }
  }
}

/**
 * Get all Networks belonging to the currently authenticated user
 */
export const getAllNetworks: ActionCreator<
  ThunkAction<
    Promise<AnyAction>,
    INetworksState,
    null,
    IGetAllNetworksIdsAction
  >
> = () => {
  return async (dispatch: Dispatch) => {
    dispatch(setNetworkLoading(true))

    try {
      /* Check for an authenticated User */
      const uid = auth.currentUser?.uid
      if (!uid) throw new Error("There is no currently authenticated user.")

      /* Get the IDs of the User's Networks   */
      const userData: IFirebaseUser = (
        await usersCollection.doc(uid).get()
      ).data() as IFirebaseUser

      if (!userData) throw new Error("User data not found.")

      /* Get the Networks corresponding to the IDs */
      const networks: INetwork[] = await Promise.all(
        userData.networkIds.map(
          async (id) =>
            (await networksCollection.doc(id).get()).data() as INetwork,
        ),
      )

      return dispatch({
        type: NetworkActionTypes.GET_ALL,
        networks,
      })
    } catch (error) {
      /* Failed to get list of network IDs */
      dispatch(setNetworkLoading(false))
      throw error
    }
  }
}

/**
 * Reset local network state. Called when the logout/delete account actions are successful.
 */
export const resetLocalNetworks: ActionCreator<IResetClientNetworksAction> = () => ({
  type: NetworkActionTypes.RESET_CLIENT,
})
