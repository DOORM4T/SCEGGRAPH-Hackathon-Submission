import React from "react"
import {
  Box,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Form,
  FormExtendedEvent,
  FormField,
  Heading,
  TextInput,
  Text,
} from "grommet"

import Header from "../components/Header"
import { Link, useHistory } from "react-router-dom"
import { useDispatch } from "react-redux"
import { login, setAuthLoading } from "../store/auth/authActions"
import { auth } from "../firebase"
import { ActionCreator, AnyAction } from "redux"

const LoginPage: React.FC<IProps> = (props: IProps) => {
  const [values, setValues] = React.useState<IForm>(defaultFormValue)
  const [errorMessage, setMessage] = React.useState<string>("")
  const dispatch: ActionCreator<AnyAction> = useDispatch()
  const history = useHistory()

  React.useEffect(() => {
    /* redirect to dashboard if the user is already signed in */
    auth.onAuthStateChanged((user) => {
      if (user) history.push("/dashboard")
    })
  }, [])

  const handleSubmit = async (e: FormExtendedEvent<unknown, Element>) => {
    e.preventDefault()
    const submitted = e.value as IForm

    try {
      const loginAction = login(submitted.email, submitted.password)
      await dispatch(loginAction)
      history.push("/dashboard")
    } catch (error) {
      /* end loading state */
      dispatch(setAuthLoading(false))

      /* show error message upon failure */
      setMessage(error.message)
    }
  }

  return (
    <React.Fragment>
      <Header title="Log in" />
      <Box direction="column" align="center">
        <Card
          height="medium"
          width="medium"
          background="light-1"
          margin={{ top: "large" }}
          fill="vertical"
        >
          <CardHeader pad="medium" justify="center">
            <Heading level={2} textAlign="center">
              Log in
            </Heading>
          </CardHeader>
          <CardBody pad={{ horizontal: "large" }}>
            <Form
              value={values}
              onChange={(nextValue) => setValues(nextValue as IForm)}
              onReset={() => setValues(defaultFormValue)}
              onSubmit={handleSubmit}
              validate="blur"
            >
              <FormField name="email" label="Email">
                <TextInput name="email" type="email" />
              </FormField>
              <FormField name="password" label="Password">
                <TextInput name="password" type="password" />
              </FormField>
              <Box direction="column" gap="medium" pad={{ bottom: "large" }}>
                {errorMessage && (
                  <Box>
                    <Text color="status-error" size="xsmall">
                      {errorMessage}
                    </Text>
                  </Box>
                )}
                <Button type="submit" label="Log in" />
              </Box>
            </Form>
          </CardBody>
          <CardFooter
            pad={{ horizontal: "medium", vertical: "small" }}
            background="light-2"
          >
            <Box margin={{ left: "auto" }}>
              <Link to="/register">Or... Register now!</Link>
            </Box>
          </CardFooter>
        </Card>
      </Box>
    </React.Fragment>
  )
}

export default LoginPage

interface IProps {}

interface IForm {
  email: string
  password: string
}

const defaultFormValue: IForm = {
  email: "",
  password: "",
}
