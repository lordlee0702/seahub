import React, { Component, Fragment } from 'react';
import { Link } from '@reach/router';
import moment from 'moment';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import { gettext, siteRoot, loginUrl, canGenerateUploadLink } from '../../utils/constants';
import SharedLinkInfo from '../../models/shared-link-info';

class Content extends Component {

 constructor(props) {
    super(props);
    this.state = {
      modalOpen: false,
      modalContent: ''
    };
  }

  // required by `Modal`, and can only set the 'open' state
  toggleModal = () => {
    this.setState({
      modalOpen: !this.state.modalOpen
    });
  }

  showModal = (options) => {
    this.toggleModal();
    this.setState({modalContent: options.content});
  }

  render() {
    const { loading, errorMsg, items } = this.props;

    if (loading) {
      return <span className="loading-icon loading-tip"></span>;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <div className="empty-tip">
          <h2>{gettext("You don't have any share links")}</h2>
          <p>{gettext("You can generate a share link for a folder or a file. Anyone who receives this link can view the folder or the file online.")}</p>
        </div>
      );

      const table = (
        <React.Fragment>
          <table className="table-hover">
            <thead>
              <tr>
                <th width="4%">{/*icon*/}</th>
                <th width="36%">{gettext("Name")}<a className="table-sort-op by-name" href="#"> <span className="sort-icon icon-caret-up"></span></a></th>{/* TODO:sort */}
                <th width="24%">{gettext("Library")}</th>
                <th width="12%">{gettext("Visits")}</th>
                <th width="14%">{gettext("Expiration")}<a className="table-sort-op by-time" href="#"> <span className="sort-icon icon-caret-down hide" aria-hidden="true"></span></a></th>{/*TODO:sort*/}
                <th width="10%">{/*Operations*/}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                return (<Item key={index} item={item} showModal={this.showModal} onRemoveLink={this.props.onRemoveLink}/>);
              })}
            </tbody>
          </table>
          <Modal isOpen={this.state.modalOpen} toggle={this.toggleModal} centered={true}>
            <ModalHeader toggle={this.toggleModal}>{gettext('Link')}</ModalHeader>
            <ModalBody>
              {this.state.modalContent}
            </ModalBody>
          </Modal>
        </React.Fragment>
      );

      return items.length ? table : emptyTip; 
    }
  }
}

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      showOpIcon: false,
    };
  }

  handleMouseOver = () => {
    this.setState({showOpIcon: true});
  }

  handleMouseOut = () => {
    this.setState({showOpIcon: false});
  }

  viewLink = (e) => {
    e.preventDefault();
    this.props.showModal({content: this.props.item.link});
  }
  
  removeLink = (e) => {
    e.preventDefault();
    this.props.onRemoveLink(this.props.item);
  }

  getLinkParams = () => {
    let item = this.props.item;
    let icon_size = Utils.isHiDPI() ? 48 : 24;
    let iconUrl = '';
    let linkUrl = '';
    if (item.is_dir) {
      iconUrl = Utils.getFolderIconUrl({
        is_readonly: false, 
        size: icon_size
      });
      linkUrl = `${siteRoot}library/${item.repo_id}/${item.repo_name}${Utils.encodePath(item.path)}`;
    } else {
      iconUrl = Utils.getFileIconUrl(item.obj_name, icon_size); 
      linkUrl = `${siteRoot}lib/${item.repo_id}/file${Utils.encodePath(item.path)}`;
    }

    return { iconUrl, linkUrl };
  }

  renderExpriedData = () => {
    let item = this.props.item;
    if (!item.expire_date) {
      return (
        <Fragment>--</Fragment>
      );
    }
    let expire_date = moment(item.expire_date).format('YYYY-MM-DD');
    return (
      <Fragment>
        {item.is_expired ? 
          <span className="error">{expire_date}</span> :
          expire_date
        }
      </Fragment>
    );
  }

  render() {
    const item = this.props.item;
    let { iconUrl, linkUrl } = this.getLinkParams();

    let iconVisibility = this.state.showOpIcon ? '' : ' invisible';
    let linkIconClassName = 'sf2-icon-link action-icon' + iconVisibility; 
    let deleteIconClassName = 'sf2-icon-delete action-icon' + iconVisibility;

    return (
      <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
        <td><img src={iconUrl} width="24" /></td>
        <td>
          {item.is_dir ?
            <Link to={linkUrl}>{item.obj_name}</Link> :
            <a href={linkUrl} target="_blank">{item.obj_name}</a>
          }
        </td>
        <td><Link to={`${siteRoot}library/${item.repo_id}/${item.repo_name}/`}>{item.repo_name}</Link></td>
        <td>{item.view_cnt}</td>
        <td>{this.renderExpriedData()}</td> 
        <td>
          <a href="#" className={linkIconClassName} title={gettext('View')} onClick={this.viewLink}></a>
          <a href="#" className={deleteIconClassName} title={gettext('Remove')} onClick={this.removeLink}></a>
        </td>
      </tr>
    );
  }
}

class ShareAdminShareLinks extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      items: []
    };
  }

  componentDidMount() {
    seafileAPI.listShareLinks().then((res) => {
      // res: {data: Array(2), status: 200, statusText: "OK", headers: {…}, config: {…}, …}
      let items = res.data.map(item => {
        return new SharedLinkInfo(item);
      });
      this.setState({
        loading: false,
        items: items
      });
    }).catch((error) => {
      if (error.response) {
        if (error.response.status == 403) {
          this.setState({
            loading: false,
            errorMsg: gettext("Permission denied")
          });
          location.href = `${loginUrl}?next=${encodeURIComponent(location.href)}`;
        } else {
          this.setState({
            loading: false,
            errorMsg: gettext("Error")
          });
        }

      } else {
        this.setState({
          loading: false,
          errorMsg: gettext("Please check the network.")
        });
      }
    });
  }

  onRemoveLink = (item) => {
    seafileAPI.deleteUploadLink(item.token).then(() => {
      let items = this.state.items.filter(uploadItem => {
        return uploadItem.token !== item.token;
      });
      this.setState({items: items});
      // TODO: show feedback msg
      // gettext("Successfully deleted 1 item")
    }).catch((error) => {
    // TODO: show feedback msg
    });
  }

  render() {
    return (
      <div className="main-panel-cneter">
        <div className="cur-view-container">
          <div className="cur-view-path">
            <ul className="nav">
              <li className="nav-item">
                <Link to={`${siteRoot}share-admin-share-links/`} className="nav-link active">{gettext('Share Links')}</Link>
              </li>
              {canGenerateUploadLink && (
                <li className="nav-item"><Link to={`${siteRoot}share-admin-upload-links/`} className="nav-link">{gettext('Upload Links')}</Link></li>
              )}
            </ul>
          </div>
          <div className="cur-view-content">
            <Content
              errorMsg={this.state.errorMsg}
              items={this.state.items}
              loading={this.state.loading}
              onRemoveLink={this.onRemoveLink}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default ShareAdminShareLinks;
