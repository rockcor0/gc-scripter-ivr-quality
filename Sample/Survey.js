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
const flowName               = '001-MyFlow-Survey-Test';
const flowDescription        = 'Flujo de IVR de encuesta';

// --------------------------------------------------------------------------------
// Survey paramethers
// --------------------------------------------------------------------------------
const numberOfCuestions     = 10;
const hasCloseTheLoop       = true;
const loopCount             = 3;

const dataActionIdLogin     = 'custom_-_cf430cad-a5ad-4e8a-83b2-612362d3518f';

const question1id           = '10b5e814-d2db-4b1d-bf58-38874f60c65a';

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

        // Audio de inicio
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

        const loginTask = scriptingTaskFactory.addTask(archInboundCallFlow, 'Login', false);
        const createInteractionTask = scriptingTaskFactory.addTask(archInboundCallFlow, 'Create Interaction', false);
        const questions = createQuestionsTask(archInboundCallFlow);

        //Close the loop
        let closeTheLoopTask = null;
        if(hasCloseTheLoop){
            closeTheLoopTask = createCloseTheLoopTask(archInboundCallFlow);
            scriptingActionFactory.addActionDisconnect(closeTheLoopTask, 'end of task disconnect');
        }
        
        const startUpTask = scriptingTaskFactory.addTask(archInboundCallFlow, 'StartUpTask', true);
        confStartUpTask(archInboundCallFlow, startUpTask, loginTask);
        
        confCreateLoginTask(archInboundCallFlow, loginTask, createInteractionTask);

       // confLoginTask(archInboundCallFlow, loginTask, createInteractionTask);

        //Temp
        //scriptingActionFactory.addActionDisconnect(loginTask, 'end of task disconnect');
        scriptingActionFactory.addActionDisconnect(createInteractionTask, 'end of task disconnect');

        for(item in questions){
            scriptingActionFactory.addActionDisconnect(questions[item], `end of task disconnect ${item}`);
        }


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

function createCloseTheLoopTask(archInboundCallFlow){
    return scriptingTaskFactory.addTask(archInboundCallFlow, 'Close The Loop', false);
}

function createQuestionsTask(archInboundCallFlow){
    let questionTaks = [];
    for(var i=1; i<=numberOfCuestions; i++){
        const question$i = scriptingTaskFactory.addTask(archInboundCallFlow, `Question ${i}`, false);
        questionTaks.push(question$i);
    }
    return questionTaks;
}

function setDataActionInputs(dataAction){
    ruido('Metodo inputs');

    //console.log(dataAction.dataActionInputs.getNamedValueByIndex(0).setVariable('Flow.sample'));
    console.log(dataAction.dataActionInputs);
    console.log(dataAction.isArchActionCallData);
    console.log(dataAction.outputs);
    console.log(dataAction.dataActionOutputsSuccess.setVariable('Flow.test'));
    console.log(dataAction.dataActionOutputsFailure);
    console.log(dataAction.getOutputByName);

    ruido('');
}

function confCreateLoginTask(archInboundCallFlow, loginTask, createInteractionTask){

    //const callDataAction = scriptingActionFactory.addActionCallData(loginTask, 'Login Data Action').setDataActionByIdAsync(dataActionIdLogin);
    //var callDataAction = scriptingActionFactory.addActionCallData(loginTask, 'Login Data Action').setDataActionByIdAsync('custom_-_98e45449-b0b6-47da-abee-5d018479439d',setDataActionInputs());
    const callDataAction = scriptingActionFactory.addActionCallData(loginTask, 'Login Data Action');
    callDataAction.setDataActionByIdAsync(dataActionIdLogin, setDataActionInputs(callDataAction));

    // Creación de Loop
    //const loop = scriptingActionFactory.addActionLoop(loginTask, 'Nombre del loop', 'Task.indice', loopCount);
    //const getParticipantDataCustomerData = scriptingActionFactory.addActionGetParticipantData(loop.outputLoop, 'GetParticipantData CustomerData');
    //getParticipantDataCustomerData.addAttributeNameOutputValuePair('"var_ivr_customerName"','Flow.var_ivr_customerName');
    scriptingActionFactory.addActionDisconnect(loginTask, 'end of task disconnect');
}

function confStartUpTask(archInboundCallFlow, startupTask, loginTask){
        //Agregar tarea de inicio
        //const startupTask = scriptingTaskFactory.addTask(archInboundCallFlow, 'Inicializar variables', true);

        //Agregar componente de Actualizar Datos
        const updateDataHeader = scriptingActionFactory.addActionUpdateData(startupTask, 'Header');

        updateDataHeader.addUpdateDataStatement(archInboundCallFlow.dataTypes.boolean, 'Flow.encabezado', 'false');
        //updateDataHeader.addUpdateDataStatement(archInboundCallFlow.dataTypes.integer, 'Task.var1', '1');
        //updateDataHeader.addUpdateDataStatement(archInboundCallFlow.dataTypes.string, 'Task.var2', '"Some text"');

        const updateDataUuiData = scriptingActionFactory.addActionUpdateData(startupTask, 'UUIIData');
        updateDataUuiData.addUpdateDataStatement(archInboundCallFlow.dataTypes.string, 'Flow.var_scr_uuiData', 'Split(Call.UUIData,",")');
        //updateDataUuiData.addUpdateDataStatement(archInboundCallFlow.dataTypes.strings, 'Flow.var_scr_uuiData', 'MakeEmptyList(ToString(NOT_SET))');

        //Agregar componente de actualizar datos, para definir las variables del flujo.
        const updateDataVars = scriptingActionFactory.addActionUpdateData(startupTask, 'Flow vars');
        updateDataVars.addUpdateDataStatement(archInboundCallFlow.dataTypes.string, 'Flow.var_ivr_ani', 'if(Contains(ToPhoneNumber(Call.Ani).e164,"+"),Substring(Split(ToPhoneNumber(Call.Ani).e164,"+")[1],2,20),ToPhoneNumber(Call.Ani).e164)');
        updateDataVars.addUpdateDataStatement(archInboundCallFlow.dataTypes.string, 'Flow.var_ivr_dnis', 'if(Contains(ToPhoneNumber(Call.CalledAddress).e164,"+"),Substring(Split(ToPhoneNumber(Call.CalledAddress).e164,"+")[1],2,20),ToPhoneNumber(Call.CalledAddress).e164)');
        updateDataVars.addUpdateDataStatement(archInboundCallFlow.dataTypes.string, 'Flow.var_ivr_interactionId', 'Call.ConversationId');
        updateDataVars.addUpdateDataStatement(archInboundCallFlow.dataTypes.string, 'Flow.var_ivr_username', '"a34e8d60-fa2a-43a4-af51-8df6e5cebd6e"');
        updateDataVars.addUpdateDataStatement(archInboundCallFlow.dataTypes.string, 'Flow.var_ivr_password', '"Uwsf%G7b2hW9x(6&s)zS^E#s[qS2FZ@7)._5&9b`4Qc5$4s-W>-fP`S>@eWFCS__(t>zwFd2C2&2Rc%.hfv?ZCUs7Q)Ays"');
        updateDataVars.addUpdateDataStatement(archInboundCallFlow.dataTypes.string, 'Flow.var_ivr_interactionDate', 'ToString(AddHours(GetCurrentDateTimeUtc(),-5))');
        updateDataVars.addUpdateDataStatement(archInboundCallFlow.dataTypes.string, 'Flow.var_scr_queueId', 'Split(Flow.var_scr_uuiData,",")[2]');
        updateDataVars.addUpdateDataStatement(archInboundCallFlow.dataTypes.string, 'Flow.var_scr_queueName', 'Split(Flow.var_scr_uuiData,",")[3]');
        updateDataVars.addUpdateDataStatement(archInboundCallFlow.dataTypes.string, 'Flow.var_scr_personId', 'Split(Flow.var_scr_uuiData,",")[0]');
        updateDataVars.addUpdateDataStatement(archInboundCallFlow.dataTypes.string, 'Flow.var_scr_personName', 'Split(Flow.var_scr_uuiData,",")[1]');
        updateDataVars.addUpdateDataStatement(archInboundCallFlow.dataTypes.string, 'Flow.var_scr_numeroSolicitud', 'Split(Flow.var_scr_uuiData,",")[4]');
        updateDataVars.addUpdateDataStatement(archInboundCallFlow.dataTypes.string, 'Flow.var_ivr_customerId', 'Split(Flow.var_scr_uuiData,",")[5]');
        updateDataVars.addUpdateDataStatement(archInboundCallFlow.dataTypes.string, 'Flow.var_ivr_customerDni', '""');
        updateDataVars.addUpdateDataStatement(archInboundCallFlow.dataTypes.string, 'Flow.var_ivr_customerName', '""');
        updateDataVars.addUpdateDataStatement(archInboundCallFlow.dataTypes.boolean, 'Flow.var_ivr_esAltoValor', 'false');
        updateDataVars.addUpdateDataStatement(archInboundCallFlow.dataTypes.string, 'Flow.var_scr_custom1', '""');
        updateDataVars.addUpdateDataStatement(archInboundCallFlow.dataTypes.string, 'Flow.var_scr_custom2', '""');
        updateDataVars.addUpdateDataStatement(archInboundCallFlow.dataTypes.string, 'Flow.var_scr_custom3', '""');
        updateDataVars.addUpdateDataStatement(archInboundCallFlow.dataTypes.string, 'Flow.var_scr_custom4', '""');
        updateDataVars.addUpdateDataStatement(archInboundCallFlow.dataTypes.string, 'Flow.var_scr_custom5', '""');
        updateDataVars.addUpdateDataStatement(archInboundCallFlow.dataTypes.string, 'Flow.var_ivr_origin', '"PureCloud Contact Center"');
        updateDataVars.addUpdateDataStatement(archInboundCallFlow.dataTypes.string, 'Flow.var_ivr_p1', '""');
        updateDataVars.addUpdateDataStatement(archInboundCallFlow.dataTypes.string, 'Flow.var_ivr_p2', '""');
        updateDataVars.addUpdateDataStatement(archInboundCallFlow.dataTypes.string, 'Flow.var_ivr_p3', '""');
        updateDataVars.addUpdateDataStatement(archInboundCallFlow.dataTypes.string, 'Flow.var_ivr_p4', '""');
        updateDataVars.addUpdateDataStatement(archInboundCallFlow.dataTypes.string, 'Flow.var_ivr_p5', '""');
        
        //Agregar componente de obtener datos de participante
        const getParticipantDataCustomerData = scriptingActionFactory.addActionGetParticipantData(startupTask, 'GetParticipantData CustomerData');
        getParticipantDataCustomerData.addAttributeNameOutputValuePair('"var_ivr_customerName"','Flow.var_ivr_customerName');
        getParticipantDataCustomerData.addAttributeNameOutputValuePair('"var_ivr_customerDni"','Flow.var_ivr_customerDni');

        scriptingActionFactory.addActionJumpToTask(startupTask, 'Go to Login', loginTask);

        //anUpdateData.addUpdateDataStatement(archFlow.dataTypes.integer, 'Task.var1', '3');
        // Add a decision action that checks to see if 5 is greater than 3 using an expression.
        // You could assign the expression on this call but we'll show how to do it by accessing
        // the condition property.
        //const decisionAction = scriptingActionFactory.addActionDecision(startupTask, 'greater than check');

        // The expression text we assign is like you'd enter in the Architect UI but escaped for
        // JavaScript since we're assigning the expression text in code.
        //decisionAction.condition.setExpression('5 > 3');

        //const decisionAction2 = scriptingActionFactory.addActionDecision(decisionAction.outputYes, 'otra condicion');
        //decisionAction2.condition.setExpression('1 == 1');
        //scriptingActionFactory.addActionDisconnect(decisionAction2.outputNo, 'No output disconnect');

        // For the fun of it, we'll add a disconnect action to the yes output on the decision action.
        //scriptingActionFactory.addActionDisconnect(decisionAction.outputYes, 'yes output disconnect');

        // Now we'll add a disconnect action to the end of the task.  As you can see, factories are
        // used when creating various things like menus, actions, tasks or even flows themselves.
        //scriptingActionFactory.addActionDisconnect(startupTask, 'end of task disconnect');
}

// This will start off the Architect Scripting code and call the doWork function.
scriptingSession.startWithClientIdAndSecret(location, doWork, clientId, clientSecret, void 0, clientIsClientCredentials);

function ruido(text){
    console.log(text);
    console.log("...................................................................................................................");
    console.log("...................................................................................................................");
    console.log("...................................................................................................................");
    console.log("...................................................................................................................");
    console.log("...................................................................................................................");
    console.log("...................................................................................................................");
    console.log("...................................................................................................................");
    console.log("...................................................................................................................");
}