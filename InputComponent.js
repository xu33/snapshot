var InputComponent = Snap.createClass({
	render: function() {
		return Snap.createElement('input', {
			type: this.props.type,
			onChange: this.handleChange
		})
	},
	handleChange: function() {
		
	}
})