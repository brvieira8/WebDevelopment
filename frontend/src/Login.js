import logo from './logo.svg';
import React from 'react';

class login extends React.Component {
  constructor(props) {
    super(props);
    this.state = {inputName:"", inputPassword:""};
    this.handleChangeName = this.handleChangeName.bind(this);
    this.handleChangePassword = this.handleChangePassword.bind(this);
    this.tryLogin = this.tryLogin.bind(this);
  }

  handleChangeName(event) {
    this.setState({inputName: event.target.value});
  }
  handleChangePassword(event) {
    this.setState({inputName: event.target.value});
  }

  tryLogin(){

     fetch('http://localhost:8003/login', {
         method: 'POST',
         body: new URLSearchParams({
             'name': this.state.inputName,
             'password': this.state.inputPassword
         })
    });
  }

  render() {
    return (
      <div className="login">
        
        <p>Name<input type="text" value={this.state.inputName} onChange={this.handleChangeName}></input></p>
        <p>Password<input type="password" ></input></p>
        <button onClick={this.tryLogin}>Submit</button>
      </div>
    );
  }
}



export default login;