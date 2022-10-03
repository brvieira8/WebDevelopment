const express = require("express");
const { MongoClient, Timestamp } = require("mongodb");
const uri =   "mongodb://localhost:27017";
const client = new MongoClient(uri);
const app = express();
const bodyParser = require('body-parser');
const urlencodedParser = bodyParser.urlencoded({ extended: false })
const port = 8003
const collection = "users"
const tokenExpiryTime = 300000//5 minutes converted in miliseconds
let strongPassword = new RegExp('(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])(?=.{8,})')

function checkPasswordStrength(password){
    if(strongPassword.test(password)){
        return true
    }else{
        return false
    }
}

function generate_token(length){
    //edit the token allowed characters
    var a = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890".split("");
    var b = [];  
    for (var i=0; i<length; i++) {
        var j = (Math.random() * (a.length-1)).toFixed(0);
        b[i] = a[j];
    }
    return b.join("");
}

function checkTokenStatus(tokenTimeCreation,expiryTime){
    if((Date.now()-tokenTimeCreation)>=expiryTime){
        return true
    }else{
        return false
    }
}

//API's
app.get('/test', urlencodedParser, function (req, res) {
    res.send('Working!');
    console.log("Working!")
});

//O registo pode se adicionar um verificador de email

app.post('/register', urlencodedParser,function(req,res){
    client.connect()
    var reg = req.body;
    var dbo = client.db("ProjetoWeb");
    var myobj = { name: reg.name,password:reg.password,email:reg.email,role:"user"};
    var logs = {username:reg.name,description:"User has been registrated",date:Date.now()}
    var checkEmail = {email:myobj.email};
    var checkName = {name:myobj.name};
    //Verifica primeiro se nao existe nenhuma conta a utilizar este email
    dbo.collection("users").find(checkEmail).toArray(function(err,result) {
        if(result.length!=0){
            res.status(200).send("Já existe utilizador com este email");
            client.close();
        }else{
            //Verifica se não existe nenhuma conta com este nome
            dbo.collection("users").find(checkName).toArray(function(err,result) {
                if(result.length!=0){
                    res.status(200).send("Já existe utilizador com este nome");
                    client.close();
                }else{
                    //Verifica validade da password
                    if(checkPasswordStrength(myobj.password)){
                        //Regista a nova conta
                        dbo.collection("users").insertOne(myobj, function(err, res) {
                        if (err) throw err;  
                            client.close();
                            dbo.collection("userlogs").insertOne(logs,function(err,res){
                                if(err) throw err;                                
                                    client.close();
                                });
                        });
                        res.status(201).send("Account has been registred with sucess!");
                    }else{
                        res.send("Invalid password")
                    };                   
                }
            });
        }
    });
});

//Falta verificar se existe algum token ja para este user
app.post('/login', urlencodedParser,function(req,res){
    client.connect()
    var userExists = false;
    var log = req.body
    var dbo = client.db("ProjetoWeb");
    var myObj = {name: log.name, password: log.password};
    var checkName1 = {name:myObj.name, password:myObj.password};
    var checkUserId = {name:myObj.name, password:myObj.password};
    var checkToken ={name:myObj.name};
    const dateObject = new Date();
    var logs = {username:log.name,description:"User has logged in",time:Date.now()}

    //Verifica se o user existe, de acordo com o username e password
    dbo.collection("users").find(checkName1).toArray(function(err,result){
        if(err) throw err;
        if(result.length!=0){
            //Gera token
            dbo.collection("tokens").find(checkToken).toArray(function(err,result){
                //Verificação para confirmar se nao existe token em nome deste user
                if(result.length==0){
                    var newToken = {name:myObj.name,token:generate_token(15),timeCreated:Date.now()}
                    dbo.collection("tokens").insertOne(newToken,function(err,result){
                        if (err) throw err;
                        client.close();
                        dbo.collection("userlogs").insertOne(logs,function(err,res){
                            if(err) throw err;                                
                                client.close();
                            });
                    });
                    res.send("Token creaated");
                }
                else{
                    res.send("Already exists one token associated to this user!")
                }
            });            
        }else{
            res.status(201).send("Não existe utilizador");
        }        
    });    
});

app.post('/logout',urlencodedParser,function(req,res){
    var dbo = client.db("ProjetoWeb");
    var out = req.body
    var userLogout = {token:out.token,name:out.name}
    var checkTokenExists = {token:userLogout.token,name:userLogout.name};
    var logs = {username:out.name,description:"User has logged out",time:Date.now()}
    dbo.collection("tokens").find(checkTokenExists).toArray(function(err,result){
        if(result.length!=0){
            dbo.collection("tokens").remove(checkTokenExists)
            dbo.collection("userlogs").insertOne(logs,function(err,res){
                if(err) throw err;                                
                    client.close();
                });
            res.send("Token deleted")
        }else{
            res.send("This token doesnt exists")
        }        
    });
});

app.post('/setseller',urlencodedParser,function(req,res){
    var dbo = client.db("ProjetoWeb");
    var userBody = req.body
    var user = {name:userBody.name,role:"manager"}
    dbo.collection("users").find({name:userBody.name}).toArray(function(err,result){
        if(result.length!=0){
            dbo.collection("users").updateOne({ name:userBody.name }, { $set: { role: "seller" } })
            res.send("User role changed to manager")
        }else{
            res.send("There is no user with this name")
        }
    });
});

app.post('/addDeviceType',urlencodedParser,function(req,res){
    var dbo = client.db("ProjetoWeb");
    var deviceBody =req.body
    var device = {type:deviceBody.type}
    dbo.collection("devicetypes").insertOne(deviceBody,function(err,result){
        res.send("Device type has been aded!")
    })
})


app.post('/removeDeviceType',urlencodedParser,function(req,res){
    var dbo = client.db("ProjetoWeb");
    var device=req.body
    var querry={type:device.type}
    dbo.collection("devicetypes").find(querry).toArray(function(err,result){
        if(result.length!=0){
            dbo.collection("devicetypes").remove(querry)
            res.send("Device type unregistred sucessfully")
        }else{
            res.send("Error while trying to unregister")
        }
    });
    
})

app.post('/addDevice',urlencodedParser,function(req,res){
    var dbo = client.db("ProjetoWeb");
    var deviceBody =req.body
    var device = {owner:deviceBody.name,model:deviceBody.model,name:deviceBody.name,type:deviceBody.type}
    var logs = {owner:deviceBody.name,model:deviceBody.model,type:deviceBody.type,description:"Device has been added",date:Date.now()}
    dbo.collection("devices").insertOne(deviceBody,function(err,result){
        dbo.collection("devicelogs").insertOne(logs,function(err,result){
            if (err) throw err;
            client.close();
            res.send("Device has been added!a")
        })
    })
})



app.post('/addDeviceModel',urlencodedParser,function(req,res){
    var dbo = client.db("ProjetoWeb");
    var deviceBody =req.body
    var device = {devicemodel:deviceBody.devicemodel,devicetype:deviceBody.devicetype}
    dbo.collection("devicemodels").insertOne(deviceBody,function(err,result){
        res.send("Device has been aded!")
    })
})

app.post('/removeDeviceModel',urlencodedParser,function(req,res){
    var dbo = client.db("ProjetoWeb");
    var device=req.body
    var querry={devicemodel:device.devicemodel,devicetype:device.devicetype}
    dbo.collection("devicemodels").find(querry).toArray(function(err,result){
        if(result.length!=0){
            dbo.collection("devicemodels").remove(querry)
            res.send("Device model unregistred sucessfully")
        }else{
            res.send("Error while trying to unregister")
        }
    });    
})

app.post('/stopMonitoringDevice',urlencodedParser,function(req,res){
    var dbo = client.db("ProjetoWeb");
    var device=req.body
    var querry={owner:device.owner,idDevice:device.id}
    var logs={owner:device.owner,model:device.model,type:device.type,description:"User has stopped this device from being monitored"}
    dbo.collection("devices").find(querry).toArray(function(err,result){
        if(result.length!=0){
            dbo.collection("devices").updateOne(querry, { $set: { owner: "unregistered" } })
            dbo.collection("devicelogs").insertOne(logs,function(err,result){
                if (err) throw err;
                client.close();
                res.send("Monitoring this device has been stoped")
            })
        }else{
            res.send("Error while trying to stop")
        }
    });    
})

app.post('/unregisterDevice',urlencodedParser,function(req,res){
    var dbo = client.db("ProjetoWeb");
    var device=req.body
    var querry={owner:device.owner,idDevice:device.id}
    dbo.collection("devices").find(querry).toArray(function(err,result){
        if(result.length!=0){
            dbo.collection("devices").deleteOne(querry)
            res.send("Device removed sucessfully")
        }else{
            res.send("Error while trying to removing")
        }
    });
})

app.get('/userlogs',urlencodedParser,function(req,res){
    var dbo =client.db("ProjetoWeb");
    dbo.collection("userlogs").find({}).toArray(function(err,result){
        res.send(result);
    })
});


app.get('/devicelogsmodel',urlencodedParser,function(req,res){
    var dbo =client.db("ProjetoWeb");
    var i=req.body
    var querry={model:i.model}
    dbo.collection("devicelogs").find(querry).toArray(function(err,result){
        res.send(result);
    })
});


app.get('/devicelogstype',urlencodedParser,function(req,res){
    var dbo =client.db("ProjetoWeb");
    var i=req.body
    var querry={type:i.type}
    dbo.collection("devicelogs").find(querry).toArray(function(err,result){
        res.send(result);
    })
});



app.listen(port, () => console.log(`Listening at http://localhost:${port}`))

