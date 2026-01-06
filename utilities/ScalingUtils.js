import { Dimensions, Platform, Text, TextInput } from 'react-native';

const { height, width } = Dimensions.get('window');

export const responsiveHeight = (h) => height * (h / 100);

export const deviceHeight = height;

export const deviceWidth = width;

export const responsiveWidth = (w) => width * (w / 100);

export const responsiveFontSize = (f) =>
	Math.sqrt(height * height + width * width) * (f / 100);

export function isIphoneXorAbove() {
	const dimen = Dimensions.get('window');
	return (
		Platform.OS === 'ios' &&
		!Platform.isPad &&
		!Platform.isTV &&
		(dimen.height === 780 ||
			dimen.width === 780 ||
			dimen.height === 812 ||
			dimen.width === 812 ||
			dimen.height === 844 ||
			dimen.width === 844 ||
			dimen.height === 852 ||
			dimen.width === 852 ||
			dimen.height === 932 ||
			dimen.width === 932 ||
			dimen.height === 896 ||
			dimen.width === 896 ||
			dimen.height === 926 ||
			dimen.width === 926 ||
			dimen.height === 874 ||
			dimen.width === 874 ||
			dimen.height === 956 ||
			dimen.width === 956)
	);
}

export function disableFontScaling() {
	if (Text.defaultProps == null) {
		Text.defaultProps = {};
	}
	Text.defaultProps.allowFontScaling = false;
	if (TextInput.defaultProps == null) {
		TextInput.defaultProps = {};
	}
	TextInput.defaultProps.allowFontScaling = false;
}

//isIOS
export const isIOS = Platform.OS === 'ios';

//scale
export function scale(size) {
	const baseWidth = 350;
	const windowDimensions = Dimensions.get('window');
	const shorterWindowDimension =
		windowDimensions.width > windowDimensions.height
			? windowDimensions.height
			: windowDimensions.width;
	return (shorterWindowDimension / baseWidth) * size;
}
