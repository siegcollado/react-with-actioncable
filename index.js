import React, { Component } from 'react'
import PropTypes from 'prop-types'

export default (options) => (Inner) => {

  const defaults = {
    params: () => {},
    onConnect: () => {},
    onReject: () => {},
    onReceive: (data) => ({ [options.channel]: { ...data } }),
    onDisconnect: () => {},
    broadcasters: {},
    serverMethods: {},
    autoConnect: true
  }

  const {
    params,
    onConnect,
    onReceive,
    onDisconnect,
    onReject,
    channel,
    broadcasters,
    autoConnect,
    serverMethods
  } = { ...defaults, ...options }


  class WithActionCable extends Component {

    static propTypes = {
      cable: PropTypes.object.isRequired
    }

    constructor (props) {
      super(props)

      if (autoConnect) {
        this.connectToChannel(params(props))
      }
    }

    state = {
      data: {},
      boundBroadcasters: { ...broadcasters },
      boundMethods: { ...serverMethods },
      connected: false
    }

    componentWillUnmount () {
      this.removeSubscription()
    }

    connectToChannel = (channelParams = {}) => {
      const {
        connected
      } = this.state

      if (!connected) {

        console.log(`[ActionCable] connecting to ${channel}`)

        const {
          cable: {
            subscriptions
          }
        } = this.props

        this.channel = subscriptions.create(
          {
            channel,
            channelParams
          },
          {
            connected: this.handleConnection,
            disconnected: this.handleDisconnection,
            received: this.handleReceivedData,
            rejected: this.handleRejection
          }
        )
      }
    }

    disconnectFromChannel = () => {
      const {
        connected
      } = this.state

      if (connected) {
        console.log(`[ActionCable] disconnecting from ${channel}`)

        this.removeSubscription()
        this.handleDisconnection()
      }
    }

    handleReceivedData = (dataFromChannel) => {

      console.log(`[ActionCable] received data from ${channel}`, dataFromChannel)

      const data = onReceive(dataFromChannel, this.props) || null

      this.setState({ data })
    }

    handleConnection = () => {

      const boundBroadcasters = {}
      const boundMethods = {}

      // Connects functions to ActionCable.send and ActionCable.perform(method)

      Object.keys(broadcasters).forEach((broadcaster) => {
        boundBroadcasters[broadcaster] = (...broadcastParams) => {
          const computedParams = broadcasters[broadcaster](...broadcastParams)
          console.log('[ActionCable] Broadcasting', computedParams)
          this.channel.send(computedParams)
        }
      })

      Object.keys(serverMethods).forEach((method) => {
        boundMethods[method] = (...methodParams) => {
          const computedParams = serverMethods[method](...methodParams)
          console.log(`[ActionCable] calling ${channel}#${method}`, computedParams)
          this.channel.perform(method, computedParams)
        }
      })

      this.setState({
        boundMethods,
        boundBroadcasters,
        connected: true
      })

      console.log(`[ActionCable] connected to ${channel}`)

      onConnect(this.channel)
    }

    handleDisconnection = () => {

      const {
        connected
      } = this.state

      // If we're not connected anyway to actioncable (based on the state),
      // it might be that our connection was rejected, so lets run the
      // onReject callback instead

      if (!connected) {
        console.log(`[ActionCable] disconnected from ${channel}, but we weren't connected anyway.`)
        this.handleRejection()
      } else {
        console.log(`[ActionCable] disconnected from ${channel}`)
        this.removeSubscription()
        onDisconnect()
      }
    }

    handleRejection = () => {
      this.removeSubscription()
      onReject()
    }

    removeSubscription = () => {

      const {
        cable: {
          subscriptions
        }
      } = this.props

      if (this.channel) {
        console.log(`[ActionCable] removing subscription to ${channel}`)

        subscriptions.remove(this.channel)

        // remove calls
        this.setState({
          connected: false,
          // remove calls to actioncable as well.
          boundBroadcasters: { ...broadcasters },
          boundMethods: { ...serverMethods }
        })
      }
    }


    render () {

      const {
        data,
        boundBroadcasters,
        boundMethods,
        connected
      } = this.state

      const cableProps = {
        connected,
        connectToChannel: this.connectToChannel,
        disconnectFromChannel: this.disconnectFromChannel
      }

      return (
        <Inner
          {...this.props}
          {...data}
          {...boundBroadcasters}
          {...boundMethods}
          cable={cableProps} />
      )
    }
  }

  // let's move the ActionCableProvider context calls outside of the WithActionCable component
  // so that we can change implementations easily
  const ActionCableProviderWrapper = (props, { cable }) => (
    <WithActionCable {...props} cable={cable} />
  )

  ActionCableProviderWrapper.contextTypes = {
    cable: PropTypes.object.isRequired
  }

  return ActionCableProviderWrapper
}
