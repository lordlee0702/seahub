import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';

const propTypes = {
  menuPosition: PropTypes.object.isRequired,
  currentNode: PropTypes.object.isRequired,
  toggleRename: PropTypes.func.isRequired,
  toggleDelete: PropTypes.func.isRequired,
  toggleAddFile: PropTypes.func.isRequired,
  toggleAddFolder: PropTypes.func.isRequired,
};

class NodeMenu extends React.Component {

  toggleAddFile = () => {
    this.props.toggleAddFile();
  }
  
  toggleAddFolder = () => {
    this.props.toggleAddFolder();
  }

  toggleRename = () => {
    this.props.toggleRename();
  }
  
  toggleDelete = () => {
    this.props.toggleDelete();
  }

  renderNodeMenu() {
    let position = this.props.menuPosition;
    let style = {position: 'fixed',left: position.left, top: position.top, display: 'block'};

    if (this.props.currentNode.type === 'dir') {
      if (this.props.currentNode.name === '/') {
        return (
          <ul className="dropdown-menu" style={style}>
            <li className="dropdown-item" onClick={this.toggleAddFolder}>{gettext('New Folder')}</li>
            <li className="dropdown-item" onClick={this.toggleAddFile}>{gettext('New File')}</li>
          </ul>
        );
      }
      
      return (
        <ul className="dropdown-menu" style={style}>
          <li className="dropdown-item" onClick={this.toggleAddFolder}>{gettext('New Folder')}</li>
          <li className="dropdown-item" onClick={this.toggleAddFile}>{gettext('New File')}</li>
          <li className="dropdown-item" onClick={this.toggleRename}>{gettext('Rename')}</li>
          <li className="dropdown-item" onClick={this.toggleDelete}>{gettext('Delete')}</li>
        </ul>
      );
    }

    return (
      <ul className="dropdown-menu" style={style}>
        <li className="dropdown-item" onClick={this.toggleRename}>{gettext('Rename')}</li>
        <li className="dropdown-item" onClick={this.toggleDelete}>{gettext('Delete')}</li>
      </ul>
    );
    
  }

  render() {
    if (!this.props.currentNode) {
      return (<div className="node-menu-module"></div>);
    }
    return (
      <div className="node-menu-module">
        {this.renderNodeMenu()}
      </div>
    );
  }
}

NodeMenu.propTypes = propTypes;

export default NodeMenu;
