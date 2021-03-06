import React, {Component, Fragment} from 'react';
import PropTypes from 'prop-types';
import * as WebMidi from "webmidi";
import {inputById, portById} from "../utils/ports";
import {PACER_MIDI_INPUT_PORT_NAME} from "../pacer/constants";
import {produce} from "immer";

const propTypes = {
    classname: PropTypes.string,
    only: PropTypes.string,                 // regex applied to port.name
    autoConnect: PropTypes.string,          // regex applied to port.name
    portsRenderer: PropTypes.func,
    // inputRenderer: PropTypes.func,
    // outputRenderer: PropTypes.func,
    messageType: PropTypes.string,
    onMidiInputEvent: PropTypes.func,
    onMidiOutputEvent: PropTypes.func,
    onInputConnection: PropTypes.func,      // callback with port.id as parameter
    onOutputConnection: PropTypes.func,     // callback with port.id as parameter
    onInputDisconnection: PropTypes.func,   // callback with port.id as parameter
    onOutputDisconnection: PropTypes.func,  // callback with port.id as parameter
    setOutput: PropTypes.func,              // callback with port.id as parameter
    children: PropTypes.node
};

const defaultProps = {
    classname: "",
    only: ".*",
    messageType: "midimessage"
};

/**
 *
 * @param props
 * @constructor
 */
export default class Midi extends Component {

    //TODO: allow specification of channel and message types to listen to

    state = {
        inputs: [],         // array of MIDI inputs (filtered from WebMidi object)
        outputs: [],        // array of MIDI outputs (filtered from WebMidi object)
        input: null,        // MIDI output port enabled
        output: null,       // MIDI output port enabled,
        pacerPresent: false
        // pacerInputConnected: false,
        // pacerOutputConnected: false
    };

    connectInput = port => {
        if (this.props.onMidiInputEvent) {
            if (port) {
                if (port.hasListener(this.props.messageType, 'all', this.props.onMidiInputEvent)) {
                    console.warn(`Midi.connectInput: sysex messages on all channels listener already connected`);
                } else {
                    console.log(`Midi.connectInput: add listener for sysex messages on all channels`);
                    port.addListener(this.props.messageType, 'all', this.props.onMidiInputEvent);
                    if (this.props.onInputConnection) {
                        this.props.onInputConnection(port.id);
                    }
                    console.log("connectInput: ", port.name);
                    // if (port.name.match(new RegExp(PACER_MIDI_INPUT_PORT_NAME, 'i'))) {
                    //     // console.log("connectInput: matched ", port.name);
                    //     this.setState({ pacerInputConnected: true })
                    // }
                }
            }
        }
    };

    disconnectInput = port => {
        if (port) {
            if (port.removeListener) port.removeListener();
            console.log(`disconnectInput: input ${port.id} disconnected`);
            if (this.props.onInputDisconnection) {
                this.props.onInputDisconnection(port.id);
            }
            // pacerPresent: WebMidi.inputs.findIndex(port => port.name.match(r2) != null) >= 0,
            // if (port.name.match(new RegExp(PACER_MIDI_INPUT_PORT_NAME, 'i'))) {
            //     this.setState({ pacerInputConnected: false })
            // }
        }
    };

    connectOutput = port => {
        if (port) {
            this.setState({output: port.id});
            console.log(`connectOutput: output ${port.id} connected`);
            if (this.props.onOutputConnection) {
                this.props.onOutputConnection(port.id);
            }
            // if (port.name.match(new RegExp(PACER_MIDI_OUTPUT_PORT_NAME, 'i'))) {
            //     this.setState({ pacerOutputConnected: true })
            // }
        }
    };

    disconnectOutput = () => {
        if (this.state.output) {
            let port_id = this.state.output;
            this.setState(
                produce(draft => {
                    draft.pacerOutputConnected = false; // Since we only manage one connected output, if we disconnect it then the Pacer is necessarily disconnected too.
                    draft.output = null;
                })
            );
            console.log(`disconnectOutput: output ${port_id} disconnected`);
            if (this.props.onOutputDisconnection) {
                this.props.onOutputDisconnection(port_id);
            }
        }
    };

    autoConnectInput = () => {

        if (this.props.autoConnect) {

            console.log(`Midi.autoConnectInput: autoConnect ${this.props.autoConnect}`, this.state.inputs);

            if (this.state.input === null) {

                for (let port of this.state.inputs) {      //WebMidi.inputs) {

                    console.log(`Midi.autoConnectInput: port ${port.name} ${port.id}`);

                    if (port.type === 'input' && (port.name.match(new RegExp(this.props.autoConnect, 'i')) != null)) {

                        console.log(`Midi.autoConnectInput: connect ${port.name}`);

                        this.setState({input: port.id});

                        this.connectInput(port);

                        // if (port.hasListener('noteon', 'all', this.props.onMidiInputEvent)) {
                        //     console.warn(`Midi.autoConnectInput: autoConnect: listener already connected`);
                        // } else {
                        //     console.log(`Midi.autoConnectInput: autoConnect: add listener`);
                        //     port.addListener('noteon', 'all', this.props.onMidiInputEvent);
                        // }
                        break;
                    }
                }

            } else {
                console.log(`Midi.autoConnectInput: autoConnect skipped, already connected`);
            }
        }
    };

    autoConnectOutput = () => {

        if (this.props.autoConnect) {

            console.log(`Midi.autoConnectOutput: autoConnect ${this.props.autoConnect}`);

            if (this.state.output === null) {

                for (let port of this.state.outputs) {

                    console.log(`Midi.autoConnectOutput: port ${port.name} ${port.id}`);

                    if (port.type === 'output' && (port.name.match(new RegExp(this.props.autoConnect, 'i')) != null)) {

                        console.log(`Midi.autoConnectOutput: autoConnect: auto-connect ${port.name}`);

                        // this.setState({output: port.id});
                        this.connectOutput(port);

                        break;
                    }
                }

            } else {
                console.log(`Midi.autoConnectOutput: autoConnect skipped, already connected`);
            }
        }
    };

    registerInputs = () => {
        const r = new RegExp(this.props.only, 'i');
        const r2 = new RegExp(PACER_MIDI_INPUT_PORT_NAME, 'i');
        // console.log(`Midi.registerInputs matching /${this.props.only}/i`, WebMidi.inputs, WebMidi.inputs.filter(port => port.name.match(r)));
        // console.log("Midi.registerInputs index ", WebMidi.inputs.findIndex(
        //     port => {
        //         console.log("array.findIndex", port.name, port.name.match(r2));
        //         return port.name.match(r2) != null
        //     }));
        this.setState({
                inputs: WebMidi.inputs.filter(port => port.name.match(r) != null),
                pacerPresent: WebMidi.inputs.findIndex(port => port.name.match(r2) != null) >= 0,
            },
            () => this.autoConnectInput()
        );
    };

    registerOutputs = () => {
        const r = new RegExp(this.props.only, 'i');
        // console.log(`Midi.registerOutputs matching /${this.props.only}/i`, WebMidi.outputs, WebMidi.outputs.filter(port => port.name.match(r) != null));
        this.setState({
                outputs: WebMidi.outputs.filter(port => port.name.match(r) != null)
            },
            () => this.autoConnectOutput()
        );
    };

    unRegisterInputs = () => {
        console.log("Midi.unRegisterInputs");
        this.disconnectInput(portById(this.state.input));
        this.setState({
            inputs: [],
            input: null,
            pacerPresent: false
        });
    };

    unRegisterOutputs = () => {
        console.log("Midi.unRegisterOutputs");
        this.disconnectOutput();
        this.setState({ outputs: [], output: null });
    };

    handleMidiConnectEvent = e => {

        console.group(`Midi: handleMidiConnectEvent: ${e.port.type} ${e.type}: ${e.port.name}`, e);

        // TODO: is disconnect event, remove the existing input listeners
        if (e.type === "disconnected") {
            // console.log(`must disconnect ${e.port} ${e.port.id}`);
            this.disconnectInput(e.port.id);
            this.disconnectOutput();
        }

        if (e.port.name.match(new RegExp(this.props.only, 'i'))) {

            if (e.port.type === 'input') {
                // console.log(`ignore MIDI input connect event`);
                console.log("Midi.handleMidiConnectEvent: call registerInputs");
                this.registerInputs();
            }

            if (e.port.type === 'output') {
                console.log("Midi.handleMidiConnectEvent: call registerOutputs");
                this.registerOutputs();
            }

        } else {

            console.log(`Midi.handleMidiConnectEvent: port ignored: ${e.port.name}`);

        }

        // Note: if we don't display the events, than the UI will not be updated if we don't update the state.

        console.groupEnd();

    };

    /**
     *
     * @param port_id
     */
    togglePort = (port_id) => {
        let p = portById(port_id);
        if (p.type === 'input') {
            console.log("toggle input", port_id);
            let prev = this.state.input;
            if (this.state.input) {
                this.disconnectInput(portById(this.state.input));
                // this.setState({ input: null });
            }
            if (port_id !== prev) {
                this.connectInput(inputById(port_id));
                // this.setState({ input: port_id });
            }
            this.setState({ input: port_id === prev ? null : port_id });
        } else {
            console.log("toggle output", port_id);
            let prev = this.state.output;
            // There is nothing to "connect" for an output port since this type of port does not generate any event.
            // if (this.state.output) this.disconnectOutput(this.state.output);
            if (this.state.output) {
                this.disconnectOutput();
            }
            if (port_id !== prev) {
                this.connectOutput(portById(port_id));
            }
            // this.setState({ output: port_id === this.state.output ? null : port_id });
        }
    };

    midiOn = err => {
        if (err) {
            console.warn("Midi.midiOn: WebMidi could not be enabled.", err);
        } else {
            console.log("Midi.midiOn: WebMidi enabled");
            WebMidi.addListener("connected", this.handleMidiConnectEvent);
            WebMidi.addListener("disconnected", this.handleMidiConnectEvent);

            /*
            if (WebMidi.hasListener("connected", this.handleMidiConnectEvent)) {
                console.log("MidiPorts.componentDidMount: handleMidiConnectEvent already set on 'connected' event");
            } else {
                WebMidi.addListener("connected", this.handleMidiConnectEvent);
            }
            if (WebMidi.hasListener("disconnected", this.handleMidiConnectEvent)) {
                console.log("MidiPorts.componentDidMount: handleMidiConnectEvent already set on 'disconnected' event");
            } else {
                WebMidi.addListener("disconnected", this.handleMidiConnectEvent);
            }
            */
        }
    };

    componentDidMount() {
        console.log(`Midi: component did mount: WebMidi.enabled=${WebMidi.enabled}`);
        if (WebMidi.enabled) {
            console.log(`Midi: component did mount: already enabled, register ports`);
            this.registerInputs();
            this.registerOutputs();
        } else {
            console.log("Midi: component did mount: Calling WebMidi.enable");
            WebMidi.enable(this.midiOn, true);  // true to enable sysex support
        }
    }

    componentWillUnmount() {
        console.log("Midi: component will unmount: unregister ports");
        this.unRegisterInputs();
        this.unRegisterOutputs();
    }


    portsGrouped = () => {
        let g = {};
        for (let p of WebMidi.inputs) {
            g[p.name] = {
                input: {
                    id: p.id,
                    selected: p.id === this.state.input
                },
                output: null
            };
        }
        for (let p of WebMidi.outputs) {
            if (!(p.name in g)) {
                g[p.name] = {
                    input: null,
                    output: null
                };
            }
            g[p.name].output = {
                id: p.id,
                selected: p.id === this.state.output
            }
        }
        return g;
    };


    render() {

        let {pacerPresent} = this.state;

        // console.log("pacerPresent", pacerPresent);

        // console.log(this.state.inputs, this.state.outputs);

        // if (input === null && output === null) {
        //     return (
        //         <div className={this.props.className}>
        //             {this.props.children}
        //         </div>
        //     );
        // } else {
            return (
                <Fragment>
                    {
                        this.props.portsRenderer(this.portsGrouped(), this.togglePort)
                    }
                    {!pacerPresent &&
                    <Fragment>
                        {this.props.children}
                    </Fragment>}
                </Fragment>
            );
        // }
    }

}

Midi.propTypes = propTypes;
Midi.defaultProps = defaultProps;
