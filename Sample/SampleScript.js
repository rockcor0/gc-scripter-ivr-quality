// --------------------------------------------------------------------------------
// Require in the Genesys Cloud Architect Scripting SDK
// --------------------------------------------------------------------------------
let architectScripting     = require('./node_modules/purecloud-flow-scripting-api-sdk-javascript');

// --------------------------------------------------------------------------------
// See above in the readme for information on creating a client id / secret.
// We will use these when starting the Architect Scripting session below.
// Remember, the Architect Scripting session object also has a way to start
// with you supplying an auth token too.
// --------------------------------------------------------------------------------
const clientId                  = '';
const clientSecret              = '';
const clientIsClientCredentials = false;  // set to false if using an OAuth client
                                         // that has a code authorization grant
                                         // instead of client credentials grant. 

// --------------------------------------------------------------------------------
// Flow name and description constants for the flow that will be created.
// --------------------------------------------------------------------------------
const flowName               = 'MyFlow';
const flowDescription        = 'This is a flow created using Architect Scripting';

// --------------------------------------------------------------------------------
// Helpers to make sample code more readable below.
// --------------------------------------------------------------------------------
const scriptingActionFactory = architectScripting.factories.archFactoryActions; // Factory to create actions
const scriptingEnums         = architectScripting.enums.archEnums;              // Enum support
const scriptingFlowFactory   = architectScripting.factories.archFactoryFlows;   // Factory to create flows
const scriptingLanguages     = architectScripting.languages.archLanguages;      // Language support
const scriptingSession       = architectScripting.environment.archSession;      // Session support
const scriptingTaskFactory   = architectScripting.factories.archFactoryTasks;   // Factory to create tasks
const scriptingLogger        = architectScripting.services.archLogging;         // Logging support

// --------------------------------------------------------------------------------
// Enables additional logging during execution.  It definitely helps when
// debugging your code so we want to show how to enable it in this example.
// --------------------------------------------------------------------------------
scriptingLogger.logNotesVerbose = true;

// --------------------------------------------------------------------------------
// Set up a constant for the organization's location.
// --------------------------------------------------------------------------------
const location = scriptingEnums.LOCATIONS.prod_us_east_1;

// --------------------------------------------------------------------------------
// This is the main function where we'll do the work of creating a flow,
// configuring it and then publishing it if there are no validation warnings
// or errors.
// --------------------------------------------------------------------------------
function doWork(scriptSession)  {

    // Return the flow creation promise here and pass in a callback function
    // to call when the flow is created.  By "created", this flow exists in
    // memory at this point.  We'll publish it later to make it available to
    // someone using Architect.  We use the flow factory to create the inbound
    // call flow.
    return scriptingFlowFactory.createFlowInboundCallAsync(flowName, flowDescription, scriptingLanguages.englishUnitedStates, function(archInboundCallFlow) {

        // This shows how you can configure audio in a call flow.  We'll set up
        // the initial greeting to use text to speech and say "welcome to the call flow"
        // using an expression.
        archInboundCallFlow.initialAudio.setDefaultCaseExpression('ToAudioTTS("welcome to the flow")');

        // Here we will turn off company directory and speech recognition for the flow.
        archInboundCallFlow.settingsSpeechRec.asrCompanyDir = scriptingEnums.SPEECH_REC_COMPANY_MODES.none;
        archInboundCallFlow.settingsSpeechRec.asrEnabledOnFlow = false;

        // In Architect Scripting, it's different than the Architect UI where there is
        // a main menu automatically created when you create a flow.  In Scripting you
        // get a blank flow so it's up to you how to configure its startup.  You'll need
        // to set a startup object which should be either a task or a menu for an inbound
        // call flow.  For this example we'll create a startup task with a disconnect
        // action in it to keep things simple.

        // Here is how you can add a reusable task to the flow.  Notice how we're
        // using the task factory to do this.  We'll also make this the flow's startup task
        // by setting true at the end of this call.
        const startupTask = scriptingTaskFactory.addTask(archInboundCallFlow, 'Tarea de inicio', true);

        // Add a decision action that checks to see if 5 is greater than 3 using an expression.
        // You could assign the expression on this call but we'll show how to do it by accessing
        // the condition property.
        const decisionAction = scriptingActionFactory.addActionDecision(startupTask, 'greater than check');

        // The expression text we assign is like you'd enter in the Architect UI but escaped for
        // JavaScript since we're assigning the expression text in code.
        decisionAction.condition.setExpression('5 > 3');

        const decisionAction2 = scriptingActionFactory.addActionDecision(decisionAction.outputYes, 'otra condicion');
        decisionAction2.condition.setExpression('1 == 1');
        scriptingActionFactory.addActionDisconnect(decisionAction2.outputNo, 'No output disconnect');

        // For the fun of it, we'll add a disconnect action to the yes output on the decision action.
        scriptingActionFactory.addActionDisconnect(decisionAction.outputYes, 'yes output disconnect');

        // Now we'll add a disconnect action to the end of the task.  As you can see, factories are
        // used when creating various things like menus, actions, tasks or even flows themselves.
        scriptingActionFactory.addActionDisconnect(startupTask, 'end of task disconnect');

        
        const otherTask = scriptingTaskFactory.addTask(archInboundCallFlow, 'Other', false);
        scriptingActionFactory.addActionDisconnect(otherTask, 'end of task disconnect');

        // This flow doesn't really do anything but the above code shows how
        // to interact with Architect Scripting.

        // Next we'll validate the flow.
        // When we get the validation results back, we'll then check the
        // results to see if there are any validation errors or warnings.
        return archInboundCallFlow.validateAsync()
            .then(function (validationResults) {

                // Does the flow have any errors or warnings?
                if (validationResults.hasErrors) {
                    scriptingLogger.logError('There is at least one validation error in the created flow.  Not publishing.');
                }
                else if (validationResults.hasWarnings) {
                    scriptingLogger.logWarning('There is at least one validation warning in the created flow.  Not publishing.');
                }
                else {

                    scriptingLogger.logNote('The flow has no validation errors or warnings.  Time to publish it.');

                    // One thing to note during a publish is that Architect looks to see if there is a flow that
                    // already exists with this name.  If so, it will delete that flow first then publish this one.
                    // As such, you'd want to amke sure that the user associated with this session has the
                    // architect:flow:delete permission. :)
                    return archInboundCallFlow.publishAsync()
                        .then(function () {
                            scriptingLogger.logNote();
                            scriptingLogger.logNote('****************************************************************************');
                            scriptingLogger.logNote('The flow \'' + archInboundCallFlow.name + '\' is now published in and available in Architect.');
                            scriptingLogger.logNote('Flow URL: ' + archInboundCallFlow.url);
                            scriptingLogger.logNote('****************************************************************************');
                            scriptingLogger.logNote();
                        }
                    );
                }
            }
        );
    });
}

// This will start off the Architect Scripting code and call the doWork function.
scriptingSession.startWithClientIdAndSecret(location, doWork, clientId, clientSecret, void 0, clientIsClientCredentials);