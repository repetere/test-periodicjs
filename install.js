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
const asyncFs = Promisie.promisifyAll(fs);
const node_module_to_test_and_copy = path.resolve(__dirname,'../../'); // /Users/yawetse/Developer/github/test/periodicjs.core.controller
const name_of_module_to_copy = node_module_to_test_and_copy.split(path.sep)[node_module_to_test_and_copy.split(path.sep).length-1]; // periodicjs.core.controller
const test_periodicjs_dir = path.resolve(node_module_to_test_and_copy,'node_modules/test-periodicjs/node_modules/periodicjs/'); // /Users/yawetse/Developer/github/test/periodicjs.core.controller/node_modules/test-periodicjs/node_modules/periodicjs
const test_periodicjs_dir_node_modules_dir = path.resolve(test_periodicjs_dir,'node_modules'); // /Users/yawetse/Developer/github/test/periodicjs.core.controller/node_modules/test-periodicjs/node_modules/periodicjs/node_modules
const copy_module_to_test_periodicjs_dir_extname = path.join(test_periodicjs_dir_node_modules_dir,name_of_module_to_copy); // /Users/yawetse/Developer/github/test/periodicjs.core.controller/node_modules/test-periodicjs/node_modules/periodicjs/node_modules/periodicjs.core.controller

console.log('node_module_to_test_and_copy',node_module_to_test_and_copy); // /Users/yawetse/Developer/github/test/periodicjs.core.controller
console.log('test_periodicjs_dir',test_periodicjs_dir); // /Users/yawetse/Developer/github/test/periodicjs.core.controller/node_modules/test-periodicjs/node_modules/periodicjs
console.log('name_of_module_to_copy',name_of_module_to_copy); // periodicjs.core.controller
console.log('test_periodicjs_dir_node_modules_dir',test_periodicjs_dir_node_modules_dir); // /Users/yawetse/Developer/github/test/periodicjs.core.controller/node_modules/test-periodicjs/node_modules/periodicjs/node_modules
console.log('copy_module_to_test_periodicjs_dir_extname',copy_module_to_test_periodicjs_dir_extname); // /Users/yawetse/Developer/github/test/periodicjs.core.controller/node_modules/test-periodicjs/node_modules/periodicjs/node_modules/periodicjs.core.controller


asyncFs.ensureDirAsync(test_periodicjs_dir_node_modules_dir)
	.then(()=>{
		console.log('created test dir');
		return asyncFs.copy(node_module_to_test_and_copy,copy_module_to_test_periodicjs_dir_extname,{
			filter:function(file){
				// console.log('file',file);
				if(file.match(/node_modules\/test-periodicjs/gi)){
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
			let extConfigExists = fs.statSync(path.join(node_module_to_test_and_copy,'periodicjs.ext.json'));
			console.log('extConfigExists',extConfigExists);
			if(!extConfigExists){
				console.log('testing core module',extConfigExists);
			}
			else{
				console.log('testing extension',extConfigExists);
				return asyncFs.readJsonAsync(path.join(node_module_to_test_and_copy,'periodicjs.ext.json'));
			}
		}
		catch(e){
			console.log('testing core module');
		}
	})
	.then((extensionDepJson)=>{
		let extensionsToInstall=[];
		if(extensionDepJson && Array.isArray(extensionDepJson.periodicDependencies) && extensionDepJson.periodicDependencies.length>0){
			extensionDepJson.periodicDependencies.forEach(function(extObj){
				if(extObj && extObj.extname && extObj.version){
					extensionsToInstall.push( extObj.extname+'@'+extObj.version);
				}
			});
		}
		var npmconfig = {
			'strict-ssl': false,
			'save-optional': false,
			'production': true,
			'prefix': test_periodicjs_dir_node_modules_dir
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
				npm.commands.install(
					extensionsToInstall,
					function(err,npmstatus){
						console.error(err);
						console.log('npmstatus',npmstatus);
					}
				);
			}
		});
		// console.log('extensionsToInstall',extensionsToInstall);
	})
	.catch((err)=>{
		console.log('test-periodicjs post install error',err);
		process.exit(0);
	});