/*
 * periodic
 * http://github.com/typesettin/periodic
 *
 * Copyright (c) 2014 Yaw Joseph Etse. All rights reserved.
 */

'use strict';
require('shelljs/global');
const Promisie = require('promisie');
const fs = Promisie.promisifyAll(require('fs-extra'));
const path = require('path');
const npm = require('npm');
const semver = require('semver');
const test_periodicjs_package_json = fs.readJsonSync(path.join(__dirname, 'package.json'));
const node_module_to_test_and_copy = path.resolve(__dirname, '../../'); // /Users/yawetse/Developer/github/test/periodicjs.core.controller
const name_of_module_to_copy = node_module_to_test_and_copy.split(path.sep)[node_module_to_test_and_copy.split(path.sep).length-1]; // periodicjs.core.controller
const test_periodicjs_dir = path.resolve(node_module_to_test_and_copy,'.test_periodicjs'); // /Users/yawetse/Developer/github/test/periodicjs.core.controller/node_modules/test-periodicjs/node_modules/periodicjs
const test_periodicjs_dir_node_modules_dir = path.resolve(test_periodicjs_dir,'node_modules'); // /Users/yawetse/Developer/github/test/periodicjs.core.controller/node_modules/test-periodicjs/node_modules/periodicjs/node_modules
const copy_module_to_test_periodicjs_dir_extname = path.join(test_periodicjs_dir_node_modules_dir,name_of_module_to_copy); // /Users/yawetse/Developer/github/test/periodicjs.core.controller/node_modules/test-periodicjs/node_modules/periodicjs/node_modules/periodicjs.core.controller
const testperiodic_extension_config_path = path.join(test_periodicjs_dir,'content/config/extensions.json');
const arrayObjectIndexOf = function(myArray, searchTerm, property) {
  for(var i = 0, len = myArray.length; i < len; i++) {
      if (myArray[i][property] === searchTerm){ return i;}
  }
  return -1;
};
const move_array = function (original_array, old_index, new_index) {
	if(new_index < 0){
		new_index = 0;
	}
	else if(new_index >= original_array.length){
		new_index = original_array.length - 1;
	}
  if (new_index >= original_array.length) {
      var k = new_index - original_array.length;
      while ((k--) + 1) {
          original_array.push(undefined);
      }
  }
  original_array.splice(new_index, 0, original_array.splice(old_index, 1)[0]);
  return original_array; // for testing purposes
};

console.log('node_module_to_test_and_copy',node_module_to_test_and_copy); // /Users/yawetse/Developer/github/test/periodicjs.core.controller
console.log('test_periodicjs_dir',test_periodicjs_dir); // /Users/yawetse/Developer/github/test/periodicjs.core.controller/node_modules/test-periodicjs/node_modules/periodicjs
console.log('name_of_module_to_copy',name_of_module_to_copy); // periodicjs.core.controller
console.log('test_periodicjs_dir_node_modules_dir',test_periodicjs_dir_node_modules_dir); // /Users/yawetse/Developer/github/test/periodicjs.core.controller/node_modules/test-periodicjs/node_modules/periodicjs/node_modules
console.log('copy_module_to_test_periodicjs_dir_extname',copy_module_to_test_periodicjs_dir_extname); // /Users/yawetse/Developer/github/test/periodicjs.core.controller/node_modules/test-periodicjs/node_modules/periodicjs/node_modules/periodicjs.core.controller
var testperiodic_extension_config = {};
var npmhelper;
var processResult = [];
var extensionsToInstall = [];

/**
 * Utility function for removing all periodic extensions that do not match the module being copied for testing
 * @param  {Function} cb Callback function
 */
var deleteUnlistedExtensions = function (cb) {
	try {
		npmhelper.getInstalledExtensions((err, installed) => {
			let extensions = installed.map(ext => {
				let extname = ext.split('@')[0];
				if (extname !== name_of_module_to_copy) {
					return fs.removeAsync(path.join(test_periodicjs_dir, 'node_modules', extname));
				}
				return extname;
			});
			Promise.all(extensions)
				.then(result => {
					cb(null, result);
				}, cb);
		});
	}
	catch (e) {
		cb(e);
	}
};

/**
 * Convenience method for running a specified npm command after loading an npm configuration
 * @param  {Object}   options An NPM configuration object
 * @param  {Function}   command An NPM command to run after loading configuration expects that method returns a Promise
 * @param  {*}   params  Any parameter to should be used as the argument for the NPM command
 * @param  {Function} cb      Callback function
 */
var runNPMProcessAfterLoad = function (options, command, params, cb) {
	try {
		npm.load(options, err => {
			if (err) {
				cb(err);
			}
			else {
				npm.commands[command](params, cb);
			}
		});
	}
	catch (e) {
		cb(e);
	}
};

/**
 * Reorders periodic extension configuration so that modules are loaded in correct order assumes that testperiodic_extension_config variable has been set before being invoked
 * @param  {Function} cb Callback function
 */
var fixExtensionOrder = function (cb) {
	try {
		let correct_order_exts = [];
		let iterations = 0;
		let maxiterations = testperiodic_extension_config.extensions.length * testperiodic_extension_config.extensions.length;
		let checkExtensionOrder = function (ext, index) {
			iterations++;
			correct_order_exts[ext.name] = [];
			if (ext.periodicConfig.periodicDependencies) {
				let depPositionIndex;
				let optionalPositionIndex;
				ext.periodicConfig.periodicDependencies.forEach(function (extDep) {
					// console.log('iterations',iterations);
					depPositionIndex = arrayObjectIndexOf(testperiodic_extension_config.extensions, extDep.extname, 'name');
					optionalPositionIndex = arrayObjectIndexOf(testperiodic_extension_config.extensions, extDep.extname, 'name');
					if (depPositionIndex >= index) {
						console.log(`WARNING : Extension[${ index }] (${ ext.name }) is being loaded before dependency (${ extDep.extname })[${ depPositionIndex }]`);
						testperiodic_extension_config.extensions = move_array(testperiodic_extension_config.extensions, index, depPositionIndex + 1);
						correct_order_exts[ext.name][extDep.extname] = { in_order: false };
					}
					else if (extDep.optional && optionalPositionIndex >= index) {
						console.log(`OPTIONAL : Extension[${ index }] (${ ext.name }) is being loaded before OPTIONAL dependency (${ extDep.extname })[${ optionalPositionIndex }]`);
						testperiodic_extension_config.extensions = move_array(testperiodic_extension_config.extensions, index, optionalPositionIndex + 1);
						correct_order_exts[ext.name][extDep.extname]= { in_order: false };
					}
					else {
						console.log(`PASS: Extension[${ index }] (${ ext.name }) is after dependency (${ extDep.extname })[${ depPositionIndex }]`);
						correct_order_exts[ext.name][extDep.extname]= { in_order: true };
					}
				});
			}
		};
		for(let i = 0; i < testperiodic_extension_config.extensions.length; i++){
			correct_order_exts = [];
			testperiodic_extension_config.extensions.forEach(checkExtensionOrder);
		}
		fs.outputJson(testperiodic_extension_config_path, testperiodic_extension_config, cb);
	}
	catch (e) {
		cb(e);
	}
};

const testPeriodicDir = path.join(__dirname, '../../.test_periodicjs');
fs.ensureDirAsync(testPeriodicDir)
	.then(() => {
		let preProcess = [{
			fn: fs.ensureDirAsync,
			argv: path.join(testPeriodicDir, 'node_modules')
		}, {
			fn: fs.writeJsonAsync,
			argv: [path.join(testPeriodicDir, 'package.json'), { name: 'test_periodicjs_installer' }]
		}].map(action => {
			return (action && Array.isArray(action.argv)) ? action.fn.apply(null, action.argv) : action.fn(action.argv);
		});
		return Promise.all(preProcess);
	})
	.then(() => exec(`cd ${ testPeriodicDir } && npm i periodicjs@${ test_periodicjs_package_json.version }`))
	.then(() => fs.ensureDirAsync(test_periodicjs_dir_node_modules_dir))
	.then(() => {
		console.log('created test dir');
		//Copies module into new test directory filtering out .git files and the test-periodicjs module
		return fs.copyAsync(node_module_to_test_and_copy, copy_module_to_test_periodicjs_dir_extname, {
			filter: file => !(/node_modules\/test-periodicjs/gi.test(file) || /\.git/gi.test(file) || /\.test_periodicjs/gi.test(file))
		});
	})
	.then(()=>{
		//Checks that extension has an extension configuration file and resolves with JSON data if configuration exists or exits the process if it does not
		return fs.statAsync(path.join(node_module_to_test_and_copy, 'periodicjs.ext.json'))
			.then(() => {
				console.log('testing extension');
				return fs.readJsonAsync(path.join(node_module_to_test_and_copy, 'periodicjs.ext.json'));
			}, () => {
				console.log('testing core module');
				process.exit(0);
			});
	})
	.then(extensionDepJson => {
		//Creates an empty extensions JSON file in the test directory, resolves with the extension configuration JSON data
		console.log('Creates an empty extensions JSON file in the test directory, resolves with the extension configuration JSON data');
		return fs.writeJsonAsync(path.join(test_periodicjs_dir, 'content/config/extensions.json'), { extensions: [] })
			.then(() => extensionDepJson, 
				e => Promise.reject(e));
	})
	.then(extensionDepJson => {
		//Adds dependencies to an array for later installation
		console.log('Adds dependencies to an array for later installation');
			npmhelper = require(path.join(test_periodicjs_dir, 'scripts/npmhelper'))({});
 		if (extensionDepJson && Array.isArray(extensionDepJson.periodicDependencies) && extensionDepJson.periodicDependencies.length) {
 			extensionsToInstall = extensionDepJson.periodicDependencies.reduce((prev, extension) => {
 				if (extension && typeof extension.extname === 'string' && typeof extension.version === 'string') {
 					prev.push(`${ extension.extname }@${ semver.clean(extension.version.replace(/~/gi, '')) }`);
 				}
 				return prev;
 			}, []);
 		}
 		//Removes any unnecessary previously installed extensions
 		console.log('Removes any unnecessary previously installed extensions');
 		return Promisie.promisify(deleteUnlistedExtensions)();
	})
	.then(result => {
		processResult.push(result);
		let npmCommand = 'install';
		let npmConfig = {
			'strict-ssl': false,
			'save-optional': false,
			'production': true,
			'prefix': test_periodicjs_dir
		};
		//Installs dependent extensions
		console.log('Installs dependent extensions');
		return Promisie.promisify(runNPMProcessAfterLoad)(npmConfig, npmCommand, extensionsToInstall);
	})
	// .then(result => {
	// 	processResult.push(result);
	// 	let npmCommand = 'install';
	// 	let npmConfig = {
	// 		'strict-ssl': false,
	// 		'save-optional': false,
	// 		'production': true,
	// 		'prefix': copy_module_to_test_periodicjs_dir_extname
	// 	};
	// 	//Installs periodic extension that is being tested
	// 	console.log('Installs periodic extension that is being tested');
	// 	return Promisie.promisify(runNPMProcessAfterLoad)(npmConfig, npmCommand, [copy_module_to_test_periodicjs_dir_extname]);
	// })
	.then(result => {
		processResult.push(result);
		//Gets extension config data
		console.log('Gets extension config data');
		return fs.readJsonAsync(testperiodic_extension_config_path);
	})
	.then(config => {
		//Sets extension config data to testperiodic_extension_config variable which fixExtensionOrder assumes will be defined
		console.log('Sets extension config data to testperiodic_extension_config variable which fixExtensionOrder assumes will be defined');
		testperiodic_extension_config = config;
		return Promisie.promisify(fixExtensionOrder)();
	})
	.then(() => {
		processResult.push('Fixed extension order');
		console.log('result', processResult);
		process.exit(0);
	})
	.catch(err => {
		console.log('test-periodicjs post install error', err.stack);
		process.exit(1);
	});
