# react-with-actioncable

A higher order component (like redux's `connect`) to connect our components to ActionCable.

This contains assumptions on your channel behavior (for example, regarding which connection is rejected) so use at your own risk, or fork it if needed.

This is used with [react-actioncable-provider](https://github.com/cpunion/react-actioncable-provider) so you need to install it too.

```bash
yarn add react-actioncable-provider
```

## Usage

```javascript
import ActionCable from 'actioncable'
import ActionCableProvider from 'react-actioncable-provider'

<ActionCableProvider cable={ActionCable.createConsumer(WEBSOCKET_URL)}>
  <App />
</ActionCableProvider>
```


For components that need to subscribe to channels, we connect it like this:

```javascript

import withActionCable from 'react-with-actioncable'

const SomeComponent = (props) => {
  const {
    name,
    helloFunction
  } = props

  return (
    <div>
      {name && `Hello ${name}`!}
      <Button onPress={helloFunction} />
    <div/>
  )
}

export default withActionCable({
  channel: 'HelloChannel', // The channel that we will subscribe to.
  // Parameters that we pass to the channel. Props are passed to it from the component
  params: (props) => ({ name: 'foo' }),
  // tell the Hoc if we want to connect the component automatically or if we want to
  // connect to it manually using the provided props.cable.connectToChannel(params) function
  autoConnect: true,
  // this is called after we connect to the channel
  onConnect: (channel) => {},
  // this is called after we disconnect to the channel
  onDisconnect: () => {},
  // this is called if the server rejects our connection
  onReject: () => {},
  // this is called when we receive new data from the channel.
  // data is from the channel, props come from the props passed to the component.
  // this function should return an object, in which this will be passed as props to the component.
  onReceive: (data, props) => {
    return {
      name: data.name
    },
  },
  // this contains functions that we are going to use to broadcast to the channel
  // these will be passed down as props to the component as well
  broadcasters: {
    // it should return an object. the channel now will receive data containing { name: name }
    helloFunction: (name) => {
      return {
        name
      }
    }
  },
  // this contains functions that are also instance methods for the actioncable channel.
  // these will be passed down as props to the component.
  serverMethods: {
    foo: (bar) => {
      // it should return an object. the channel will now call on HelloChannel#foo, with
      // { bar: bar } as data
      return {
        bar
      }
    }
  }
})(SomeComponent)
```

We can also pass this function to the `compose` function if we want to use it with redux or apollo.

```javascript
import { connect } from 'react-redux'
import { compose, graphql } from 'react-apollo'
import { withActionCable } from '../components/withActionCable'
import Component from './components/Component'

export default compose(
  graphql(),
  connect(mapState, mapDispatch),
  withActionCable({ channel: 'Foobar' })
)(Component)
```

## Todo

- Tests

# License
MIT
