var InputComponent = Snap.createClass({
	render: function() {
		var ipt = Snap.createElement('input', {
			type: this.props.type
		})

		if (this.props.value && !this.props.onChange) {
			ipt.props.onChange = this.defaultHandleChange
		}
	},
	defaultHandleChange: function(event) {
		if (event.target.value !== this.props.value) {
			this.setProps({
				value: this.props.value
			})
		}
	}
})