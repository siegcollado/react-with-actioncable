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
    params: paramResolver,
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

    static displayName = `WithActionCable(${Inner.displayName || Inner.name})`

    state = {
      data: {},
      boundBroadcasters: { ...broadcasters },
      boundMethods: { ...serverMethods },
      connected: false
    }

    componentDidMount () {
      if (autoConnect) {
        this.connectToChannel(paramResolver(props))
      }
    }

    componentWillUnmount () {
      this.removeSubscription()
    }

    resolvePassedProps () {

      const {
        data,
        boundBroadcasters,
        boundMethods,
        connected
      } = this.state

      return {
        ...this.props,
        ...data,
        ...boundBroadcasters,
        ...boundMethods,
        cable: {
          connected,
          connectToChannel: this.connectToChannel,
          disconnectFromChannel: this.disconnectFromChannel
        }
      }
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

      const data = onReceive(dataFromChannel, this.resolvePassedProps()) || null

      this.setState({ data })
    }

    handleConnection = () => {

      // Connects functions to ActionCable.send and ActionCable.perform(method)
      const boundBroadcasters = Object.keys(broadcasters).reduce((result, broadcaster) => {
        return {
          ...result,
          [broadcaster]: (...broadcastParams) => {
            const computedParams = broadcasters[broadcaster](...broadcastParams)
            console.log('[ActionCable] Broadcasting', computedParams)
            this.channel.send(computedParams)
          }
        }
      }, {})

      const boundMethods = Object.keys(serverMethods).reduce((result, method) => {
        return {
          ...result,
          [method]: (...methodParams) => {
            const computedParams = serverMethods[method](...methodParams)
            console.log(`[ActionCable] calling ${channel}#${method}`, computedParams)
            this.channel.perform(method, computedParams)
          }
        }
      }, {})

      this.setState({
        boundBroadcasters,
        boundMethods,
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
        this.channel = null

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
      return (
        <Inner {...this.resolvePassedProps()} />
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
