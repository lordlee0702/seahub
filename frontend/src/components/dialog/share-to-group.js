import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'reactstrap';
import Select from 'react-select';
import makeAnimated from 'react-select/lib/animated';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api.js';
import PermissionEditor from '../permission-editor';

class GroupItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isOperationShow: false
    };
  }
  
  onMouseEnter = () => {
    this.setState({isOperationShow: true});
  }

  onMouseLeave = () => {
    this.setState({isOperationShow: false});
  }

  deleteShareItem = () => {
    let item = this.props.item;
    this.props.deleteShareItem(item.group_info.id);
  }

  onChangeUserPermission = (permission) => {
    let item = this.props.item;
    this.props.onChangeUserPermission(item, permission);
  }

  render() {
    let item = this.props.item;
    return (
      <tr onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td className='name'>{item.group_info.name}</td>
        <td>
          <PermissionEditor 
            isTextMode={true}
            isEditIconShow={this.state.isOperationShow}
            currentPermission={item.permission}
            permissions={this.props.permissions}
            onPermissionChangedHandler={this.onChangeUserPermission}
          />
        </td>
        <td>
          <span
            className={`sf2-icon-x3 action-icon ${this.state.isOperationShow ? '' : 'hide'}`}
            onClick={this.deleteShareItem} 
            title={gettext('Delete')}
          >
          </span>
        </td>
      </tr>
    );
  }
}

class GroupList extends React.Component {

  render() {
    let items = this.props.items;
    return (
      <tbody>
        {items.map((item, index) => {
          return (
            <GroupItem 
              key={index} 
              item={item} 
              permissions={this.props.permissions}
              deleteShareItem={this.props.deleteShareItem}
              onChangeUserPermission={this.props.onChangeUserPermission}
            />
          );
        })}
      </tbody>
    );
  }
}

const propTypes = {
  isGroupOwnedRepo: PropTypes.bool,
  itemPath: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired
};

class ShareToGroup extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      selectedOption: null,
      errorMsg: [],
      permission: 'rw',
      sharedItems: []
    };
    this.options = [];
    this.permissions = ['rw', 'r', 'cloud-edit', 'preview'];
    if (this.props.isGroupOwnedRepo) {
      this.permissions = ['rw', 'r'];
    }
  }

  handleSelectChange = (option) => {
    this.setState({selectedOption: option});
  }

  componentDidMount() {
    this.loadOptions();
    this.listSharedGroups();
  }

  loadOptions = () => {
    seafileAPI.shareableGroups().then((res) => {
      this.options = [];
      for (let i = 0 ; i < res.data.length; i++) {
        let obj = {};
        obj.value = res.data[i].name;
        obj.id = res.data[i].id;
        obj.label = res.data[i].name;
        this.options.push(obj);
      }
    });
  }

  listSharedGroups = () => {
    let path = this.props.itemPath;
    let repoID = this.props.repoID; 
    seafileAPI.listSharedItems(repoID, path, 'group').then((res) => {
      if(res.data.length !== 0) {
        this.setState({
          sharedItems: res.data
        });
      }
    });
  }

  setPermission = (permission) => {
    this.setState({permission: permission});
  }

  shareToGroup = () => {
    let groups = [];
    let path = this.props.itemPath;
    let repoID = this.props.repoID; 
    let isGroupOwnedRepo = this.props.isGroupOwnedRepo;
    if (this.state.selectedOption && this.state.selectedOption.length > 0 ) {
      for (let i = 0; i < this.state.selectedOption.length; i ++) {
        groups[i] = this.state.selectedOption[i].id;
      }
    }
    if (isGroupOwnedRepo) {
      seafileAPI.shareGroupOwnedRepoToGroup(repoID, this.state.permission, groups).then(res => {
        let errorMsg = [];
        if (res.data.failed.length > 0) {
          for (let i = 0 ; i < res.data.failed.length ; i++) {
            errorMsg[i] = res.data.failed[i];
          }
        }

        // todo modify api
        let items = res.data.success.map(item => {
          let sharedItem = {
            'group_info': { 'id': item.group_id, 'name': item.group_name},
            'permission': item.permission,
            'share_type': 'group',
          };
          return sharedItem;
        });
  
        this.setState({
          errorMsg: errorMsg,
          sharedItems: this.state.sharedItems.concat(items),
          selectedOption: null,
          permission: 'rw',
        });
      });
    } else {
      seafileAPI.shareFolder(repoID, path, 'group', this.state.permission, groups).then(res => {
        let errorMsg = [];
        if (res.data.failed.length > 0) {
          for (let i = 0 ; i < res.data.failed.length ; i++) {
            errorMsg[i] = res.data.failed[i];
          }
        }
  
        this.setState({
          errorMsg: errorMsg,
          sharedItems: this.state.sharedItems.concat(res.data.success),
          selectedOption: null,
          permission: 'rw'
        });
      });
    }
  }

  deleteShareItem = (groupID) => {
    let path = this.props.itemPath;
    let repoID = this.props.repoID; 
    if (this.props.isGroupOwnedRepo) {
      seafileAPI.deleteGroupOwnedRepoSharedGroupItem(repoID, groupID).then(() => {
        this.setState({
          sharedItems: this.state.sharedItems.filter(item => { return item.group_info.id !== groupID; }) 
        });
      });
    } else {
      seafileAPI.deleteShareToGroupItem(repoID, path, 'group', groupID).then(() => {
        this.setState({
          sharedItems: this.state.sharedItems.filter(item => { return item.group_info.id !== groupID; }) 
        });
      });
    }
  }

  onChangeUserPermission = (item, permission) => {
    let path = this.props.itemPath;
    let repoID = this.props.repoID;
    let groupID = item.group_info.id;
    if (this.props.isGroupOwnedRepo) {
      seafileAPI.modifyGroupOwnedRepoGroupSharedPermission(repoID, permission, groupID).then(() => {
        this.updateSharedItems(item, permission);
      })
    } else {
      seafileAPI.updateShareToGroupItemPermission(repoID, path, 'group', groupID, permission).then(() => {
        this.updateSharedItems(item, permission);
      });
    }
  }
  
  updateSharedItems = (item, permission) => {
    let groupID = item.group_info.id;
    let sharedItems = this.state.sharedItems.map(sharedItem => {
      let sharedItemGroupID = sharedItem.group_info.id;
      if (groupID === sharedItemGroupID) {
        sharedItem.permission = permission;
      }
      return sharedItem;
    });
    this.setState({sharedItems: sharedItems});
  }

  render() {
    return (
      <Fragment>
        <table>
          <thead>
            <tr>
              <th width="40%">{gettext('Group')}</th>
              <th width="40%">{gettext('Permission')}</th>
              <th width="20%"></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <Select
                  isMulti
                  onChange={this.handleSelectChange}
                  options={this.options}
                  placeholder={gettext('Select a group')}
                  components={makeAnimated()}
                  inputId={'react-select-2-input'}
                  value={this.state.selectedOption}
                />
              </td>
              <td>
                <PermissionEditor 
                  isTextMode={false}
                  isEditIconShow={false}
                  currentPermission={this.state.permission}
                  permissions={this.permissions}
                  onPermissionChangedHandler={this.setPermission}
                />
              </td>
              <td>
                <Button onClick={this.shareToGroup}>{gettext('Submit')}</Button>
              </td>
            </tr>
            {this.state.errorMsg.length > 0 &&                  
              this.state.errorMsg.map((item, index) => {
                let errMessage = item.group_name + ': ' + item.error_msg;
                return (
                  <tr key={index}>
                    <td colSpan={3}><p className="error">{errMessage}</p></td>
                  </tr>
                );
              })                                                
            }
          </tbody>
        </table>
        <div className="share-list-container">
          <table className="table-thead-hidden">
            <thead>
              <tr>
                <th width="40%">{gettext('Group')}</th>
                <th width="40%">{gettext('Permission')}</th>
                <th width="20%"></th>
              </tr>
            </thead>
            <GroupList 
              items={this.state.sharedItems}
              permissions={this.permissions}
              deleteShareItem={this.deleteShareItem} 
              onChangeUserPermission={this.onChangeUserPermission}
            />
          </table>
        </div>
      </Fragment>
    );
  }
}

ShareToGroup.propTypes = propTypes;

export default ShareToGroup;
