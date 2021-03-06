import { ActionCreator } from "redux"
import { convertTypeAcquisitionFromJson } from "typescript"
import { auth, usersCollection } from "../../firebase/services"
import { deleteNetwork, resetLocalNetworks } from "../networks/actions"
import { AppThunk } from "../store"
import {
  AuthActionTypes,
  IAuthCreateAccountAction,
  IAuthDeleteAccountAction,
  IAuthLoading,
  IAuthLoginAction,
  IAuthLogoutAction,
  IAuthSetUserAction,
  IUserDocument,
} from "./authTypes"

// -== ACTION CREATORS ==- //
/* Set isLoading state. Used by asynchronous auth action. */
export const setAuthLoading = (isLoading: boolean): IAuthLoading => ({
  type: AuthActionTypes.LOADING,
  isLoading,
})

/**
 * Create a new user account in the authentication system and users collection
 * @param email
 * @param password
 */
export const createAccount = (email: string, password: string): AppThunk => {
  return async (dispatch) => {
    dispatch(setAuthLoading(true))

    try {
      const credentials = await auth.createUserWithEmailAndPassword(
        email,
        password,
      )

      if (!credentials.user) throw new Error("Failed to get credentials.")

      const id = credentials.user.uid
      if (!id) throw new Error("Failed to get the new user's id.")

      /* Initialize the user's "users" collection document */
      const userDocument: IUserDocument = {
        id: credentials.user.uid,
        email,
        networkIds: [],
      }

      /* Save the user document */
      await usersCollection.doc(credentials.user.uid).set(userDocument)

      /* Send the user an email verification message */
      credentials.user.sendEmailVerification()

      /* Update state with the logged in user ID */
      const action: IAuthCreateAccountAction = {
        type: AuthActionTypes.CREATE_ACCOUNT,
        id,
      }
      return dispatch(action)
    } catch (error) {
      dispatch(setAuthLoading(false))
      throw error
    }
  }
}

/**
 * Log in an existing user
 * @param email
 * @param password
 */
export const login = (email: string, password: string): AppThunk => {
  return async (dispatch) => {
    dispatch(setAuthLoading(true))

    /* Clear any existing networks -- zero-login networks created before the user logs in doesn't belong to them
        To add a zero-login network to their account, users should export the network before logging in.
        Then they import it after they're logged in */
    dispatch(resetLocalNetworks())

    try {
      /* Sign in */
      const credentials = await auth.signInWithEmailAndPassword(email, password)
      if (!credentials.user) throw new Error("Failed to get credentials.")

      /* Get ID */
      const id = credentials.user.uid
      if (!id) throw new Error("Failed to get the user's id.")

      /* Update state with the logged in user's ID */
      const action: IAuthLoginAction = {
        type: AuthActionTypes.LOGIN,
        id,
      }
      return dispatch(action)
    } catch (error) {
      dispatch(setAuthLoading(false))
      throw error
    }
  }
}

/**
 * Sign out the currently authenticated user
 */
export const logout = (): AppThunk => {
  return async (dispatch) => {
    dispatch(setAuthLoading(true))

    try {
      await auth.signOut()

      /* Clear current network data after logging out */
      dispatch(resetLocalNetworks())
    } catch (error) {
      dispatch(setAuthLoading(false))
      throw error
    }

    /* Update global auth state by dispatching the logout action */
    const action: IAuthLogoutAction = {
      type: AuthActionTypes.LOGOUT,
    }
    return dispatch(action)
  }
}

/**
 * Delete the currently authenticated user account, along with their related network documents
 */
export const deleteAccount = (): AppThunk => {
  return async (dispatch) => {
    dispatch(setAuthLoading(true))

    try {
      /* Ensure a user is logged in */
      if (!auth.currentUser) throw new Error("No user is currently logged in.")
      const userId = auth.currentUser.uid

      /* Access the user's Firebase document */
      const userDoc = usersCollection.doc(userId)
      const userDataDoesExist = (await userDoc.get()).exists
      if (userDataDoesExist) {
        /* Get user document data */
        const userData: IUserDocument = (
          await userDoc.get()
        ).data() as IUserDocument

        /* Delete the user document */
        await userDoc.delete()

        /* Delete all network documents created by the user */
        const networkDeleteList = userData.networkIds.map(async (id) => {
          return await dispatch(deleteNetwork(id))
        })
        await Promise.all(networkDeleteList)
      }

      /* Delete the current user from Firebase Auth */
      await auth.currentUser.delete()

      /* Update state */
      const action: IAuthDeleteAccountAction = {
        type: AuthActionTypes.DELETE_ACCOUNT,
      }
      return dispatch(action)
    } catch (error) {
      /* Failed to delete the user */
      dispatch(setAuthLoading(false))
      throw error
    }
  }
}

/**
 * Set the current logged in user
 * @param userId ID of the currently authenticated user
 */
export const setUser: ActionCreator<IAuthSetUserAction> = (userId: string) => ({
  type: AuthActionTypes.SET_USER,
  userId,
})
