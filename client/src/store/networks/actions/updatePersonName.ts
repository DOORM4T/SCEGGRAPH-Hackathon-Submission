import { peopleCollection } from "../../../firebase/services"
import { AppThunk } from "../../store"
import { IUpdatePersonNameAction, NetworkActionTypes } from "../networkTypes"
import { setNetworkLoading } from "./setNetworkLoading"

/**
 * Update a person's name
 * @param personId
 * @param updatedName
 */

export const updatePersonName = (
  personId: string,
  updatedName: string,
): AppThunk => async (dispatch, getState) => {
  dispatch(setNetworkLoading(true))

  try {
    /* Update the database if the user is authenticated */
    const uid = getState().auth.userId
    if (uid) {
      /* Update the person document in firebase */
      const personDoc = await peopleCollection.doc(personId).get()

      /* Stop if the person does not exist */
      if (!personDoc.exists)
        throw new Error(`Person ${personId} does not exist`)

      /* Update the person's name field*/
      personDoc.ref.update({ name: updatedName })
    }

    /* Update global state accordingly with personId and updatedName */
    const action: IUpdatePersonNameAction = {
      type: NetworkActionTypes.UPDATE_PERSON_NAME,
      personId,
      updatedName,
    }

    return dispatch(action)
  } catch (error) {
    /* Failed to change the person's name */
    dispatch(setNetworkLoading(false))
    throw error
  }
}
