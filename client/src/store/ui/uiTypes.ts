// -== STATE TYPES ==- //
export interface IUserInterfaceState {
  readonly isLoading: boolean
  readonly isPersonEditMenuOpen: boolean
  readonly personInFocus: string | null
  readonly personInZoom: string | null
}

// -== ACTION TYPES ==- //
export enum UserInterfaceActionTypes {
  LOADING = "UI/LOADING",
  FOCUS_ON_PERSON_BY_ID = "UI/FOCUS_ON_PERSON_BY_ID",
  TOGGLE_PERSON_EDIT_MENU = "UI/TOGGLE_PERSON_EDIT_MENU",
  ZOOM_TO_PERSON = "UI/ZOOM_TO_PERSON",
}

export interface ISetUILoadingAction {
  type: UserInterfaceActionTypes.LOADING
  isLoading: boolean
}

export interface IFocusOnPersonAction {
  type: UserInterfaceActionTypes.FOCUS_ON_PERSON_BY_ID
  personId: string | null
}

export interface ITogglePersonEditMenuAction {
  type: UserInterfaceActionTypes.TOGGLE_PERSON_EDIT_MENU
  isOpen: boolean
}

export interface IZoomToPersonAction {
  type: UserInterfaceActionTypes.ZOOM_TO_PERSON
  personId: string | null // ID of the person to zoom-in on. null means no person is zoomed in on
}

/* action types used by the networks reducer */
export type UserInterfaceActions =
  | ISetUILoadingAction
  | IFocusOnPersonAction
  | ITogglePersonEditMenuAction
  | IZoomToPersonAction
