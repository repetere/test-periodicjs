/*
 * periodic
 * http://github.com/typesettin/periodic
 *
 * Copyright (c) 2014 Yaw Joseph Etse. All rights reserved.
 */

'use strict';
const Promisie = require('promisie');
const fs = require('fs-extra');
const path = require('path');
const npm = require('npm');
const async = require('async');
const asyncFs = Promisie.promisifyAll(fs);
const node_module_to_test_and_copy = path.resolve(__dirname,'../../'); // /Users/yawetse/Developer/github/test/periodicjs.core.controller
const name_of_module_to_copy = node_module_to_test_and_copy.split(path.sep)[node_module_to_test_and_copy.split(path.sep).length-1]; // periodicjs.core.controller
const test_periodicjs_dir = path.resolve(node_module_to_test_and_copy,'node_modules/test-periodicjs/node_modules/periodicjs/'); // /Users/yawetse/Developer/github/test/periodicjs.core.controller/node_modules/test-periodicjs/node_modules/periodicjs
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

// console.log('node_module_to_test_and_copy',node_module_to_test_and_copy); // /Users/yawetse/Developer/github/test/periodicjs.core.controller
// console.log('test_periodicjs_dir',test_periodicjs_dir); // /Users/yawetse/Developer/github/test/periodicjs.core.controller/node_modules/test-periodicjs/node_modules/periodicjs
// console.log('name_of_module_to_copy',name_of_module_to_copy); // periodicjs.core.controller
// console.log('test_periodicjs_dir_node_modules_dir',test_periodicjs_dir_node_modules_dir); // /Users/yawetse/Developer/github/test/periodicjs.core.controller/node_modules/test-periodicjs/node_modules/periodicjs/node_modules
// console.log('copy_module_to_test_periodicjs_dir_extname',copy_module_to_test_periodicjs_dir_extname); // /Users/yawetse/Developer/github/test/periodicjs.core.controller/node_modules/test-periodicjs/node_modules/periodicjs/node_modules/periodicjs.core.controller
var extConfigExists = false;
var testperiodic_extension_config = {};

asyncFs.ensureDirAsync(test_periodicjs_dir_node_modules_dir)
	.then(()=>{
		console.log('created test dir');
		return asyncFs.copy(node_module_to_test_and_copy,copy_module_to_test_periodicjs_dir_extname,{
			filter:function(file){
				// console.log('file',file);
				if(file.match(/node_modules\/test-periodicjs/gi) || file.match(/\.git/gi)){
					return false;
				}
				else{
					return true;
				}
			}
		});
	})
	.then(()=>{
		try{
			extConfigExists = fs.statSync(path.join(node_module_to_test_and_copy,'periodicjs.ext.json'));
			console.log('extConfigExists',extConfigExists);
			if(!extConfigExists){
				console.log('testing core module');
				process.exit(0);
			}
			else{
				console.log('testing extension');
				return asyncFs.readJsonAsync(path.join(node_module_to_test_and_copy,'periodicjs.ext.json'));
			}
		}
		catch(e){
			console.log('testing core module');
		}
	})
	.then((extensionDepJson)=>{
		if(extConfigExists){
			let extensionsToInstall=[];
			let empty_extension_json = {
			  extensions: []
			};
			fs.outputJsonSync(testperiodic_extension_config_path, empty_extension_json);

			if(extensionDepJson && Array.isArray(extensionDepJson.periodicDependencies) && extensionDepJson.periodicDependencies.length>0){
				extensionDepJson.periodicDependencies.forEach(function(extObj){
					if(extObj && extObj.extname && extObj.version){
						extensionsToInstall.push( extObj.extname+'@'+extObj.version);
					}
				});
			}

			async.series({
				delete_unlisted_extensions:function(asynccb){
					let npmhelper = require(path.join(test_periodicjs_dir,'scripts/npmhelper'))({});
					npmhelper.getInstalledExtensions(function(err,installed_extensions){
						installed_extensions = installed_extensions.map(function(ext){
							let extname = ext.split('@')[0];
							if(extname!==name_of_module_to_copy){
								fs.removeSync(path.join(test_periodicjs_dir,'node_modules',extname));
								return extname;
							}
						});
						// console.log('installed_extensions',installed_extensions);
						asynccb(err,installed_extensions);
					});
				},
				install_dependencies:function(asynccb){
					let npmconfig = {
						'strict-ssl': false,
						'save-optional': false,
						'production': true,
						'prefix': test_periodicjs_dir
					};
					npm.load(
						npmconfig,
						function (err) {
						if (err) {
							console.error(err);
							throw err;
						}
						else {
						 	// npm['save-optional'] = true;
							// fs.outputJsonSync(path.join(test_periodicjs_dir,'content/config/extensions.json'), empty_extension_json);
							npm.commands.install(extensionsToInstall,asynccb);
						}
					});
				},
				install_extension:function(asynccb){
					let npmconfig = {
						'strict-ssl': false,
						'save-optional': false,
						'production': true,
						'prefix': copy_module_to_test_periodicjs_dir_extname
					};
					npm.load(
						npmconfig,
						function (err) {
						if (err) {
							console.error(err);
							throw err;
						}
						else {
						 	// npm['save-optional'] = true;
							// fs.outputJsonSync(path.join(test_periodicjs_dir,'content/config/extensions.json'), empty_extension_json);
							npm.commands.install([copy_module_to_test_periodicjs_dir_extname],asynccb);
						}
					});
				},
				fix_extension_order:function(asynccb){
					testperiodic_extension_config = fs.readJsonSync(testperiodic_extension_config_path);
					var correct_order_exts = [];
					var iterations = 0;
					var maxiterations = testperiodic_extension_config.extensions.length* testperiodic_extension_config.extensions.length;
					// var extensions_in_correct_order = function(){
					// 	console.log('iterations',iterations);
					// 	console.log('maxiterations',maxiterations);
					// 	console.log('correct_order_exts',correct_order_exts);
					// 	var all_correct_order = true;
					// 	if(iterations<maxiterations ){
					// 		correct_order_exts.forEach(function(exts){
					// 			console.log('exts',exts);
					// 			exts.forEach(function(dep){
					// 				console.log('dep',dep);
					// 				console.log('iterations',iterations,'testperiodic_extension_config.extensions.length*2',testperiodic_extension_config.extensions.length*2);
					// 				if(dep.in_order===false && (iterations >= testperiodic_extension_config.extensions.length*2)){
					// 					all_correct_order = false;
					// 				}
					// 			});
					// 		});
					// 	}
					// 	return all_correct_order;
					// };
					var check_extension_order = function(){
						return function(ext,i){
							iterations++;
							correct_order_exts[ext.name]=[];
							if(ext.periodicConfig.periodicDependencies){
								let depPositionIndex;
								let optionalPositionIndex;
								ext.periodicConfig.periodicDependencies.forEach(function(extDep){
									// console.log('iterations',iterations);
									depPositionIndex = arrayObjectIndexOf(testperiodic_extension_config.extensions,extDep.extname,'name');
									optionalPositionIndex = arrayObjectIndexOf(testperiodic_extension_config.extensions,extDep.extname,'name');
									if(depPositionIndex>=i){
										console.log('WARNING : Extension['+i+'] ('+ext.name+') is being loaded before dependency ('+extDep.extname+')['+depPositionIndex+']');
										testperiodic_extension_config.extensions = move_array(testperiodic_extension_config.extensions, i, depPositionIndex+1);
										correct_order_exts[ext.name][extDep.extname]={in_order:false};
									}
									else if(extDep.optional && optionalPositionIndex>=i){
										console.log('OPTIONAL : Extension['+i+'] ('+ext.name+') is being loaded before OPTIONAL dependency ('+extDep.extname+')['+optionalPositionIndex+']');
										testperiodic_extension_config.extensions = move_array(testperiodic_extension_config.extensions, i, optionalPositionIndex+1);
										correct_order_exts[ext.name][extDep.extname]={in_order:false};
									}
									else {
										console.log('PASS : Extension['+i+'] ('+ext.name+') is after dependency ('+extDep.extname+')['+depPositionIndex+']');
										correct_order_exts[ext.name][extDep.extname]={in_order:true};
									}
								});
							}
						};
					};
					for(let i = 0; i < testperiodic_extension_config.extensions.length; i++){
						correct_order_exts = [];
						testperiodic_extension_config.extensions.forEach(check_extension_order());
						// console.log('iteration '+iterations+' testperiodic_extension_config',testperiodic_extension_config);
					}
					// console.log('final testperiodic_extension_config',testperiodic_extension_config);
					fs.outputJson(testperiodic_extension_config_path,testperiodic_extension_config,asynccb);
				}
			},function(err,result){
				// console.log('extensionsToInstall from dependencies',extensionsToInstall);
				console.log('result',result);
				process.exit(0);
			});

		}
		else{
			process.exit(0);
		}
	})
	.catch((err)=>{
		console.log('test-periodicjs post install error',err);
		process.exit(0);
	});