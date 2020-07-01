import React, { Component } from 'react';
import {  Row, Col, Card, Modal, 
  Button, InputNumber, notification, Tooltip, 
  Tabs, Select, Table, Input } from 'antd';
import 'antd/dist/antd.css'
import './App.css';
import request from 'superagent'
import { Layout } from 'antd';
import { ShoppingOutlined, LoginOutlined  } from '@ant-design/icons';

const { Header, Footer } = Layout;
const { Meta } = Card;
const { TabPane } = Tabs;
const { Option } = Select;

const openNotificationWithIcon = (type, msg, desc) => {
  notification[type]({
    message: `${msg}`,
    description: `${desc}`
  });
};

const columns = [
  {
    title: 'Transaction ID',
    dataIndex: 'transaction_id',
    key: 't_id',
    render: text => <a>{text}</a>,
  },
  {
    title: 'Name',
    dataIndex: 'transaction_name',
    key: 'name',
  },
  {
    title: 'Product ID',
    dataIndex: 'product_id',
    key: 'p_id',
  },
  {
    title: 'Type',
    dataIndex: 'type',
    key: 'type',
  },
  {
    title: 'Quantity',
    dataIndex: 'product_quantity',
    key: 'qty',
  },
  {
    title: 'Amount',
    dataIndex: 'amount',
    key: 'amt',
  },
  {
    title: 'Timestamp',
    dataIndex: 'timestamp',
    key: 'timestamp',
  }
]

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      productList: [],
      modal_data: {
        id: '',
        name: '',
        price: '',
        url: '',
        currency: '',
        amount_left_add: '',
        note_value: 10
      },
      visible: false,
      loading: false,
      adminVisible: false,
      reload_product_id: '',
      reload_quantity: '',
      transactionData: [],
      amount_to_collect: '',
      passwordVisible: false,
      password: ''
    }
  }

  componentDidMount = () => {
    this.getProductsData()
  }

  getProductsData = () => {
    request
      .get('http://localhost:5000/machine/products')
      .timeout({
        response: 60000,
        deadline: 60000,
      })
      .then(result => {
        if (JSON.parse(result.statusCode) === 200 &&
          JSON.parse(result.text).success) {
          let data = JSON.parse(result.text).data
          this.setState({
            productList: data
          })
        }
      })
      .catch(err => {
        if (err) {
          this.setState({
            productList: []
          })
        }
      });
  }

  showModal = (id, name, price, url, currency) => {
    let modal_data = {
      id: id,
      name: name,
      price: price,
      url: url,
      currency: currency,
      amount_left_add: price,
      note_value: 10
    }
    this.setState({
      visible: true,
      modal_data
    });
  };

  handleCancel = () => {
    if (this.state.modal_data.amount_left_add !== 0 && 
        this.state.modal_data.amount_left_add !== this.state.modal_data.price) {
      request
        .del('http://localhost:5000/machine/buy')
        .set('Content-Type', 'application/json')
        .withCredentials()
        .timeout({
          response: 60000,
          deadline: 60000,
        })
        .then(result => {
          if(JSON.parse(result.text).success) {
            notification.destroy()
            openNotificationWithIcon('success', 'Refund!', 'You have successfully received your refund.')
          }
          else {
            // console.log("Delete!")
          }
        })
        .catch(err => {
          if (err) {
            notification.destroy()
            openNotificationWithIcon('error', 'Error Occured', 'Unexpected error occured. Please try again later.')
          }
        })
    }
    let modal_data = {
      id: '',
      name: '',
      price: '',
      url: '',
      currency: '',
      amount_left_add: '',
      note_value: 10
    }
    this.setState({ visible: false, modal_data, loading: false });
  };

  add_note = () => {
    this.setState({loading: true})
    let data = {
      'product_id': parseInt(this.state.modal_data.id),
      'product_price': parseInt(this.state.modal_data.price),
      'note': parseInt(this.state.modal_data.note_value)
    }
    request
      .post('http://localhost:5000/machine/buy')
      .set('Content-Type', 'application/json')
      .withCredentials()
      .send(data)
      .timeout({
        response: 60000,
        deadline: 60000,
      })
      .then(result => {
        if (JSON.parse(result.text).success) {
          let data = JSON.parse(result.text).data
          let modal_data = {
            id: this.state.modal_data.id,
            name: this.state.modal_data.name,
            price: this.state.modal_data.price,
            url: this.state.modal_data.url,
            currency: this.state.modal_data.currency,
            amount_left_add: parseInt(data['add_amount']),
            note_value: 10
          }
          if (JSON.parse(result.text).final_buy) {
            modal_data['amount_left_add'] = 0 
            this.setState({loading: false, modal_data}, () => {
              let desc = this.state.modal_data.name + ' bought successfully with INR ' + data.balance + ' left' 
              notification.destroy()
              openNotificationWithIcon('success', 'Congratulations!', desc)
              this.handleCancel()
            })
          }
          else {
            modal_data['amount_left_add'] = parseInt(data['add_amount'])
            this.setState({
              loading: false,
              modal_data
            })
          }
        }
        else {
          this.setState({
            loading: false
          })
          notification.destroy()
          openNotificationWithIcon('error', 'Error Occured', JSON.parse(result.text).msg)
        }
      })
      .catch(err => {
        if (err) {
          notification.destroy()
          openNotificationWithIcon('error', 'Error Occured', 'This is unexpected. Please try again later.')
          this.handleCancel()
        }
      })
  }

  handleAdminCancel = () => {
    this.setState({ 
      adminVisible: false,
      reload_product_id: '',
      reload_quantity: '',
      amount_to_collect: '',
      password: ''
   })
  }

  handleAdminVisible = () => {
    this.getTransactions()
    this.setState({ 
      adminVisible: true
   })
  }

  reloadProductStock = () => {
    let { reload_product_id, reload_quantity } = this.state
    let data = {
      product_id: reload_product_id,
      product_quantity: reload_quantity
    }
    request
      .put('http://localhost:5000/machine/products')
      .set('Content-Type', 'application/json')
      .set("Authorisation", btoa('test:' + this.state.password))
      .send(data)
      .timeout({
        response: 60000,
        deadline: 60000,
      })
      .then(result => {
        if (JSON.parse(result.text).success) {
          notification.destroy()
          openNotificationWithIcon('success', 'Successful!', "Product quantity has been successfully updated.")
          this.getProductsData()
          this.getTransactions()
        }
        else {
          notification.destroy()
          openNotificationWithIcon('error', 'Error Occured', JSON.parse(result.text).msg)
        }
      })
      .catch(err => {
        if (err) {
          notification.destroy()
          openNotificationWithIcon('error', 'Error Occured', 'This is unexpected. Please try again later.')
        }
      })
  }

  getTransactions = () => {
    request
      .get('http://localhost:5000/machine/transactions')
      .set("Authorisation", btoa('test:' + this.state.password))
      .set('Content-Type', 'application/json')
      .timeout({
        response: 60000,
        deadline: 60000,
      })
      .then(result => {
        if (JSON.parse(result.text).success) {
          this.setState({
            transactionData: JSON.parse(result.text).data
          })
        }
        else {
          notification.destroy()
          openNotificationWithIcon('error', 'Error Occured', JSON.parse(result.text).msg)
        }
      })
      .catch(err => {
        if (err) {
          notification.destroy()
          openNotificationWithIcon('error', 'Error Occured', 'Please try again later.')
        }
      })
  }

  collectCash = () => {
    request
      .get('http://localhost:5000/machine/collect')
      .set("Authorisation", btoa('test:' + this.state.password))
      .timeout({
        response: 60000,
        deadline: 60000,
      })
      .then(result => {
        if (JSON.parse(result.text).success) {
          this.setState({
            amount_to_collect: JSON.parse(result.text).data.amount
          })
          this.getTransactions()
        }
        else {
          notification.destroy()
          openNotificationWithIcon('error', 'Error Occured', JSON.parse(result.text).msg)
        }
      })
      .catch(err => {
        if (err) {
          notification.destroy()
          openNotificationWithIcon('error', 'Error Occured', 'Please try again later.')
        }
      })
  }

  confirmPassword = () => {
    request
      .post('http://localhost:5000/machine/user')
      .set("Authorisation", btoa('test:' + this.state.password))
      .send({password: this.state.password})
      .timeout({
        response: 60000,
        deadline: 60000,
      })
      .then(result => {
        if (JSON.parse(result.text).success) {
          this.setState({
            passwordVisible: false,
          }, () => {
            this.handleAdminVisible()
          })
        }
        else {
          notification.destroy()
          openNotificationWithIcon('error', 'Incorrect password', 'Wrong password entered. Please try again.')
          this.setState({
            password: ''
          })}
      })
      .catch(err => {
        if (err) {
          notification.destroy()
          openNotificationWithIcon('error', 'Error Occured', 'Please try again later.')
        }
      })
  }

  render() {
    const { 
      productList, 
      visible, 
      loading, 
      modal_data,
      reload_product_id,
      reload_quantity,
      transactionData
    } = this.state

    return (
      <>
        <Modal
          title="Admin password"
          visible={this.state.passwordVisible}
          onCancel={() => { this.setState({ passwordVisible: false, password: '' })}}
          footer={null}
        >
          <Input 
            type={"password"}  
            value={this.state.password}
            onChange={(e) => this.setState({ password: e.target.value }) }
            placeholder="Password" 
          />
          <br />
          <br />
          <Button type={'primary'} onClick={() => {this.confirmPassword()}}>
            Submit
          </Button>
        </Modal>

        <Modal
          visible={visible}
          loading={loading}
          title={"Confirm " + modal_data.name}
          onCancel={this.handleCancel}
          maskClosable={false}
          footer={null}
        >
          <Row>
            <Col span={12} >
              <Card
                style={{ width: 200 }}
                cover={
                  <img
                    alt={modal_data.name}
                    style={{ height: "200px" }}
                    src={modal_data.url}
                  />
                }
              >
                <Meta
                  title={modal_data.currency + ' ' + modal_data.price}
                />
              </Card>
            </Col>
            <Col offset={4} span={8} >
              <Tooltip 
                title="Denomination allowed are INR 10, 20, 50 & 100" 
                color={"#108ee9"} 
                key={"#108ee9"}
                placement={'left'}
              >
                <p>Insert Note</p>
              </Tooltip>
              
              <InputNumber 
                style={{ width: '10em' }}
                autoFocus={true} 
                defaultValue={10} 
                value={modal_data.note_value}
                onChange={
                  (val) => { modal_data['note_value'] = val; this.setState({modal_data})}
                } 
              />
              <br />
              <br />
              <Button 
                disabled={this.state.loading ? true : false}
                style={{ margin: "0.2em" }} 
                onClick={() => this.add_note()}
                type="primary"
              >
                Add
              </Button>
              <Button
                style={{margin: "0.2em"}} 
                onClick={() => this.handleCancel()}
                type="danger"
              >
                Cancel
              </Button>
              <br/>
              <br/>
              <br/>
              <p>Amount Left To Add</p>
              <InputNumber style= {{ width: '10em' }} disabled value={modal_data.amount_left_add} />
            </Col>
          </Row>
    
        </Modal>
        
        <Modal
          visible={this.state.adminVisible}
          title={"Admin Panel"}
          width={800}
          onCancel={this.handleAdminCancel}
          maskClosable={false}
          footer={null}
          bodyStyle={{height: '30em'}}
        >
          <Tabs defaultActiveKey="1">
             
            <TabPane tab="Reload Stock" key="1">
              <>
              <Row>
                <Col span={6}>
                  <h4 style={{ padding: "5px" }}> Select a product</h4>
                </Col>
                <Col span={12}>
                  <Select style={{ width: '100%' }} value={reload_product_id} onChange={(val) => {this.setState({reload_product_id: val})}}>
                    {
                      productList.map(d => <Option key={d.product_id} value={d.product_id}>{d.product_name}</Option>)
                    }
                  </Select>
                </Col>
              </Row>

              <br />
              <br />

              <Row>
                <Col span={6}>
                  <h4 style={{ padding: "5px" }}>Enter quantity to update</h4>
                </Col>
                <Col span={12}>
                    <InputNumber
                      style={{ width: '100%' }}
                      value={reload_quantity}
                      onChange={
                        (val) => { this.setState({ reload_quantity: val }) }
                      }
                    />
                  </Col>
                </Row>
                
                <br />
                <br />

                <Row>
                  <Button onClick={() => this.reloadProductStock()} type="primary">Confirm</Button>
                </Row>

              </>
            </TabPane>

            <TabPane tab="Collect Cash" key="2">
              <>
                <Row style={{display: this.state.amount_to_collect === '' ? 'None' : 'block'}}>
                  <h3>
                    {
                      this.state.amount_to_collect === 0 ?
                      "No cash available for collection"
                      :
                        "Please collect your cash of INR " + this.state.amount_to_collect
                    }
                  </h3>
                </Row>
                <br style={{display: this.state.amount_to_collect === '' ? 'None' : 'block'}} />
                <Row>
                  <Button onClick={() => this.collectCash()} type="primary">Collect Cash</Button>
                </Row>
                </>
            </TabPane>

            <TabPane tab="Transaction History" key="3">
              <Row>
                <Table 
                  key={transactionData.length}
                  style={{ height: "22em", overflowX: 'auto' }} 
                  columns={columns} 
                  dataSource={transactionData} 
                  pagination={false}
                />
              </Row>
            </TabPane>
          </Tabs>

        </Modal>

        <Header style={{ background: "#1890ff"}}>
          <Row>
            <Col span={6} className="logo" style={{ color: "white", fontSize: '1.5em', fontWeight: '500' }}>
              Virtual Vending Machine
            </Col>

            <Col offset={17} span={1}>
              <Tooltip
                title={"Admin Login"}>
                <LoginOutlined 
                  onClick={() => {this.setState({passwordVisible: true})}} 
                  style={{ fontSize: '25px', color: 'white' }} 
                />
              </Tooltip>
            </Col>
          </Row>
        </Header>
        <br />

        <Row style={{ marginLeft: '7em' }}>
          {productList.slice(0,3).map((data) => {
            return (
              <Col span={8} key={data.product_id}>
                <Card
                  style={{ width: 300 }}
                  hoverable={
                    productList.length > 0 && data.product_quantity > 0
                      ? true
                      : false
                  }
                  actions={
                    productList.length > 0 && data['product_quantity'] > 0 ?
                      [
                        <ShoppingOutlined
                          onClick={() => (this.showModal(data['product_id'], data['product_name'], data['product_price'], data['product_url'], data['product_currency']))}
                        />
                      ]
                      :
                      ["Not Available"]
                  }
                  loading={productList.length === 0 ? true : false}
                  cover={
                    <img
                      alt={productList.length > 0 ? data.product_name : ""}
                      style={{ height: "250px" }}
                      src={productList.length > 0 ? data.product_url : ""}
                    />
                  }
                >
                  <Meta
                    title={productList.length > 0 ? data.product_name : ""}
                    description={
                      productList.length > 0
                        ? data.product_currency + " " + data.product_price
                        : ""
                    }
                  />
                </Card>
              </Col>
            );
          })}
        </Row>
        <br />

        <Row style={{ marginLeft: '7em' }}>
          {productList.slice(3, 6).map((data) => {
            return (
              <Col span={8} key={data.product_id}>
                <Card
                  style={{ width: 300 }}
                  hoverable={
                    productList.length > 0 && data.product_quantity > 0
                      ? true
                      : false
                  }
                  actions={
                    productList.length > 0 && data['product_quantity'] > 0 ?
                      [
                        <ShoppingOutlined 
                          onClick={() => (this.showModal(data['product_id'], data['product_name'], data['product_price'], data['product_url'], data['product_currency']))}
                        />
                      ]
                      :
                      ["Not Available"]
                  }
                  loading={productList.length === 0 ? true : false}
                  cover={
                    <img
                      alt={productList.length > 0 ? data.product_name : ""}
                      style={{ height: "250px" }}
                      src={productList.length > 0 ? data.product_url : ""}
                    />
                  }
                >
                  <Meta
                    title={productList.length > 0 ? data.product_name : ""}
                    description={
                      productList.length > 0
                        ? data.product_currency + " " + data.product_price
                        : ""
                    }
                  />
                </Card>
              </Col>
            );
          })}
        </Row>
        <br />

        <Row style={{ marginLeft: '7em' }}>
          {productList.slice(6, 9).map((data) => {
            return (
              <Col span={8} key={data.product_id}>
                <Card
                  style={{ width: 300 }}
                  hoverable={
                    productList.length > 0 && data.product_quantity > 0
                      ? true
                      : false
                  }
                  actions={
                    productList.length > 0 && data['product_quantity'] > 0 ?
                      [
                        <ShoppingOutlined 
                          onClick={() => (this.showModal(data['product_id'], data['product_name'], data['product_price'], data['product_url'], data['product_currency']))}
                        />
                      ]
                      :
                      ["Not Available"]
                  }
                  loading={productList.length === 0 ? true : false}
                  cover={
                    <img
                      alt={productList.length > 0 ? data.product_name : ""}
                      style={{ height: "250px" }}
                      src={productList.length > 0 ? data.product_url : ""}
                    />
                  }
                >
                  <Meta
                    title={productList.length > 0 ? data.product_name : ""}
                    description={
                      productList.length > 0
                        ? data.product_currency + " " + data.product_price
                        : ""
                    }
                  />
                </Card>
              </Col>
            );
          })}
        </Row>
        <br />
        <Footer style={{
          textAlign: 'center', position: productList.length === 0 ? 'fixed' : 'relative', left: '0', bottom: '0', width: '100%'
        }}>Created by Harshit Aggarwal</Footer>
      </>
    );
  }
}

export default App;